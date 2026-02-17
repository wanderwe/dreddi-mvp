import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { getAdminClient, loadPromiseForUser } from "../common";
import { resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";

const DAY_MS = 24 * 60 * 60 * 1000;

const getBaseUrl = (req: Request) => {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
};

const resolveProfileName = async (admin: ReturnType<typeof getAdminClient>, userId: string) => {
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name,email")
    .eq("id", userId)
    .maybeSingle<{ display_name: string | null; email: string | null }>();

  const displayName = profile?.display_name?.trim();
  if (displayName) return displayName;

  const email = profile?.email?.trim();
  if (email) return email;

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  return authUser.user?.email?.trim() || "Користувач";
};

const resolveReceiverEmail = async (
  admin: ReturnType<typeof getAdminClient>,
  userId: string
) => {
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle<{ email: string | null }>();

  if (profile?.email?.trim()) return profile.email.trim();

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  return authUser.user?.email?.trim() ?? null;
};

async function sendReminderEmail({
  to,
  senderName,
  dealTitle,
  promiseId,
  baseUrl,
}: {
  to: string;
  senderName: string;
  dealTitle: string;
  promiseId: string;
  baseUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.REMINDER_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.warn("[reminders] email provider is not configured");
    return;
  }

  const confirmUrl = `${baseUrl}/promises/${promiseId}?action=confirm`;
  const disputeUrl = `${baseUrl}/promises/${promiseId}?action=dispute`;

  const text = `${senderName} нагадує вам про угоду:\n“${dealTitle}”\n\nЧи виконано її?\n\nПідтвердити: ${confirmUrl}\nОскаржити: ${disputeUrl}`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
      <p>${senderName} нагадує вам про угоду:</p>
      <p><strong>“${dealTitle}”</strong></p>
      <p>Чи виконано її?</p>
      <p>
        <a href="${confirmUrl}" style="display:inline-block;padding:10px 14px;margin-right:8px;border-radius:8px;background:#22c55e;color:#020617;text-decoration:none;font-weight:700;">Підтвердити</a>
        <a href="${disputeUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#ef4444;color:#ffffff;text-decoration:none;font-weight:700;">Оскаржити</a>
      </p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: "Вам нагадують про угоду в Dreddi",
      text,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Email sending failed: ${response.status} ${detail}`);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    if (promise.status !== "active") {
      return NextResponse.json({ error: "Reminders are only available for active deals" }, { status: 400 });
    }

    const admin = getAdminClient();
    const executorId = resolveExecutorId(promise);
    const counterpartyId = resolveCounterpartyId(promise);
    if (!executorId || !counterpartyId || counterpartyId === executorId) {
      return NextResponse.json({ error: "Deal participants are invalid" }, { status: 400 });
    }

    if (user.id !== counterpartyId) {
      return NextResponse.json({ error: "Only counterparty can send reminder" }, { status: 403 });
    }

    const receiverId = executorId;

    const sinceIso = new Date(Date.now() - DAY_MS).toISOString();
    const { data: existingReminder, error: existingError } = await admin
      .from("deal_reminders")
      .select("id,created_at")
      .eq("deal_id", id)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: "Could not validate reminder rate limit", detail: existingError.message },
        { status: 500 }
      );
    }

    if (existingReminder) {
      return NextResponse.json({ error: "Reminder already sent in the last 24 hours" }, { status: 429 });
    }

    const { data: inserted, error: insertError } = await admin
      .from("deal_reminders")
      .insert({
        deal_id: id,
        sender_id: user.id,
        receiver_id: receiverId,
      })
      .select("created_at")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Could not create reminder", detail: insertError.message },
        { status: 500 }
      );
    }

    try {
      const senderName = await resolveProfileName(admin, user.id);
      const receiverEmail = await resolveReceiverEmail(admin, receiverId);
      if (receiverEmail) {
        await sendReminderEmail({
          to: receiverEmail,
          senderName,
          dealTitle: promise.title,
          promiseId: id,
          baseUrl: getBaseUrl(req),
        });
      }
    } catch (emailError) {
      console.warn("[reminders] email send failed", emailError);
    }

    const { count } = await admin
      .from("deal_reminders")
      .select("id", { head: true, count: "exact" })
      .eq("deal_id", id);

    return NextResponse.json({
      ok: true,
      created_at: inserted.created_at,
      count: count ?? 1,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

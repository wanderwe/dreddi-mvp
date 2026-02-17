import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { getAdminClient, loadPromiseForUser } from "../common";
import { resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";
import { isPromiseAccepted } from "@/lib/promiseAcceptance";

const DAY_MS = 24 * 60 * 60 * 1000;

type ReminderErrorCode =
  | "reminder_active_only"
  | "reminder_acceptance_required"
  | "reminder_participants_invalid"
  | "reminder_forbidden"
  | "reminder_rate_limit"
  | "reminder_feature_unavailable"
  | "reminder_create_failed"
  | "reminder_unexpected";

const errorResponse = (
  status: number,
  error_code: ReminderErrorCode,
  error: string,
  detail?: string
) => NextResponse.json({ error_code, error, detail: detail ?? null }, { status });


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
      return errorResponse(400, "reminder_active_only", "Reminders are only available for active deals");
    }

    if (!isPromiseAccepted(promise)) {
      return errorResponse(
        400,
        "reminder_acceptance_required",
        "Reminders are available only after the deal is accepted"
      );
    }

    const admin = getAdminClient();
    const executorId = resolveExecutorId(promise);
    const counterpartyId = resolveCounterpartyId(promise);
    if (!executorId || !counterpartyId || counterpartyId === executorId) {
      return errorResponse(400, "reminder_participants_invalid", "Deal participants are invalid");
    }

    if (user.id !== counterpartyId) {
      return errorResponse(403, "reminder_forbidden", "Only counterparty can send reminder");
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
      if (existingError.code === "42P01") {
        return errorResponse(503, "reminder_feature_unavailable", "Reminder feature is temporarily unavailable", existingError.message);
      }
      return errorResponse(500, "reminder_rate_limit", "Could not validate reminder rate limit", existingError.message);
    }

    if (existingReminder) {
      return errorResponse(429, "reminder_rate_limit", "Reminder already sent in the last 24 hours");
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
      if (insertError.code === "42P01") {
        return errorResponse(503, "reminder_feature_unavailable", "Reminder feature is temporarily unavailable", insertError.message);
      }
      return errorResponse(500, "reminder_create_failed", "Could not create reminder", insertError.message);
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
    return errorResponse(500, "reminder_unexpected", "Unexpected error", message);
  }
}

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { requireUser } from "@/lib/auth/requireUser";
import { getEmailProviderHealth, maybeSendNotificationEmail } from "@/lib/notifications/email";

export async function POST(req: Request) {
  const user = await requireUser(req, await cookies());
  if (user instanceof NextResponse) {
    return user;
  }

  const admin = getAdminClient();
  const dedupeKey = `email_test:${user.id}:${Date.now()}:${randomUUID().slice(0, 8)}`;

  const { data: notificationRow, error: notificationError } = await admin
    .from("notifications")
    .insert({
      user_id: user.id,
      promise_id: null,
      type: "invite",
      title: "Dreddi email test",
      body: "This is a production pipeline test email from Dreddi.",
      cta_label: "Open notifications",
      cta_url: "/notifications",
      priority: "normal",
      dedupe_key: dedupeKey,
      delivered_at: null,
    })
    .select("id")
    .single();

  if (notificationError || !notificationRow?.id) {
    return NextResponse.json(
      {
        ok: false,
        error_message: notificationError?.message ?? "Failed to create notification for email test",
      },
      { status: 500 }
    );
  }

  await maybeSendNotificationEmail(admin, {
    eventId: notificationRow.id,
    userId: user.id,
    type: "invite",
    dedupeKey,
    ctaUrl: "/notifications",
    title: "Dreddi email test",
    body: "This is a production pipeline test email from Dreddi.",
  });

  const { data: latestLog, error: latestLogError } = await admin
    .from("notification_email_sends")
    .select("id,status,type,to_email,provider_id,error_message,provider_response,created_at")
    .eq("user_id", user.id)
    .eq("dedupe_key", dedupeKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestLogError || !latestLog) {
    return NextResponse.json(
      {
        ok: false,
        error_message: latestLogError?.message ?? "Email test log was not created",
      },
      { status: 500 }
    );
  }

  if (latestLog.status !== "sent") {
    const providerHealth = getEmailProviderHealth();
    const fallbackErrorMessage =
      latestLog.status === "provider_not_configured"
        ? "RESEND_API_KEY or RESEND_FROM_EMAIL is missing"
        : "Provider rejected the request";

    return NextResponse.json(
      {
        ok: false,
        status: latestLog.status,
        configured: providerHealth.configured,
        error_message: latestLog.error_message ?? fallbackErrorMessage,
        last_send_log: latestLog,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      status: latestLog.status,
      last_send_log: latestLog,
    },
    { status: 200 }
  );
}

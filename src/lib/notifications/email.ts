import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType } from "@/lib/notifications/types";

const EMAIL_ELIGIBLE_TYPES = new Set<NotificationType>([
  "invite",
  "accepted",
  "invite_declined",
  "marked_completed",
  "completion_waiting",
  "reminder_due_24h",
  "reminder_overdue",
  "reminder_manual",
  "due_soon",
  "overdue",
]);

type EmailSendStatus = "sent" | "failed" | "provider_not_configured" | "disabled";
type EmailProvider = "resend" | "none";

type EmailPayload = {
  eventId: string;
  userId: string;
  promiseId: string;
  type: NotificationType;
  dedupeKey: string;
  ctaUrl: string;
  title: string;
  body: string;
};

type EmailLogOptions = {
  provider?: EmailProvider;
  providerId?: string | null;
  error?: string | null;
  toEmail?: string | null;
};

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

const absoluteUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) return path;
  return `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
};

const resolveEmailProvider = (): EmailProvider => {
  if (process.env.RESEND_API_KEY) return "resend";
  return "none";
};

const renderTemplate = (data: {
  heading: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  manageUrl: string;
}) => {
  const html = `
  <div style="font-family: Inter, -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; line-height: 1.5;">
    <p style="font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #065f46; margin: 0 0 12px;">Dreddi</p>
    <h1 style="font-size: 20px; margin: 0 0 12px;">${data.heading}</h1>
    <p style="font-size: 15px; margin: 0 0 20px;">${data.message}</p>
    <p style="margin: 0 0 20px;">
      <a href="${data.ctaUrl}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 10px; font-weight: 600;">${data.ctaLabel}</a>
    </p>
    <p style="font-size: 13px; color: #475569; margin: 0;">Need fewer alerts? <a href="${data.manageUrl}">Manage notifications</a>.</p>
  </div>`.trim();

  const text = [
    `Dreddi`,
    "",
    data.heading,
    "",
    data.message,
    "",
    `${data.ctaLabel}: ${data.ctaUrl}`,
    "",
    `Manage notifications: ${data.manageUrl}`,
  ].join("\n");

  return { html, text };
};

const resolveEmailCopy = (payload: EmailPayload) => {
  const manageUrl = absoluteUrl("/notifications");
  const ctaUrl = absoluteUrl(payload.ctaUrl);

  switch (payload.type) {
    case "invite": {
      const content = renderTemplate({
        heading: "You have a new deal invite",
        message: payload.body || "Open the invite to accept or decline.",
        ctaLabel: "Review invite",
        ctaUrl,
        manageUrl,
      });
      return { subject: "New Dreddi invite", ...content };
    }
    case "accepted": {
      const content = renderTemplate({
        heading: "Your invite was accepted",
        message: payload.body || "Your counterparty accepted the invite.",
        ctaLabel: "Open deal",
        ctaUrl,
        manageUrl,
      });
      return { subject: "Invite accepted", ...content };
    }
    case "invite_declined": {
      const content = renderTemplate({
        heading: "Your invite was declined",
        message: payload.body || "Your counterparty declined the invite.",
        ctaLabel: "View details",
        ctaUrl,
        manageUrl,
      });
      return { subject: "Invite declined", ...content };
    }
    case "marked_completed":
    case "completion_waiting": {
      const content = renderTemplate({
        heading: "Action needed: confirm or dispute",
        message: payload.body || "The other side asked you to review completion.",
        ctaLabel: "Review outcome",
        ctaUrl,
        manageUrl,
      });
      return { subject: "Completion review reminder", ...content };
    }
    case "reminder_due_24h":
    case "due_soon": {
      const content = renderTemplate({
        heading: "Deadline in 24 hours",
        message: payload.body || "This deal is due soon.",
        ctaLabel: "Review deadline",
        ctaUrl,
        manageUrl,
      });
      return { subject: "Deal due soon", ...content };
    }
    case "reminder_manual": {
      const content = renderTemplate({
        heading: "Reminder from your counterparty",
        message: payload.body || "The other side sent a reminder for this deal.",
        ctaLabel: "Open deal",
        ctaUrl,
        manageUrl,
      });
      return { subject: "Deal reminder", ...content };
    }
    case "reminder_overdue":
    case "deadline_passed":
    case "reminder_deadline":
    case "overdue": {
      const content = renderTemplate({
        heading: "Deal is overdue",
        message: payload.body || "This deal is overdue and needs your action.",
        ctaLabel: "Take action",
        ctaUrl,
        manageUrl,
      });
      return { subject: "Deal overdue", ...content };
    }
    default: {
      const content = renderTemplate({
        heading: payload.title,
        message: payload.body,
        ctaLabel: "Open Dreddi",
        ctaUrl,
        manageUrl,
      });
      return { subject: payload.title, ...content };
    }
  }
};

const DAY_MS = 24 * 60 * 60 * 1000;

const RATE_LIMITED_REMINDER_TYPES = new Set<NotificationType>(["reminder_manual", "reminder_deadline"]);

export const isReminderEmailRateLimited = async (admin: SupabaseClient, payload: EmailPayload, now: Date) => {
  if (!RATE_LIMITED_REMINDER_TYPES.has(payload.type)) return false;

  const cutoff = new Date(now.getTime() - DAY_MS).toISOString();
  const { data } = await admin
    .from("notification_email_sends")
    .select("id,created_at")
    .eq("user_id", payload.userId)
    .eq("promise_id", payload.promiseId)
    .eq("type", payload.type)
    .gte("created_at", cutoff)
    .in("status", ["sent", "failed", "provider_not_configured", "disabled"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
};

const logEmailSend = async (
  admin: SupabaseClient,
  payload: EmailPayload,
  status: EmailSendStatus,
  options?: EmailLogOptions
) => {
  const provider = options?.provider ?? resolveEmailProvider();
  const errorMessage = options?.error?.slice(0, 2000) ?? null;

  const attemptAt = new Date().toISOString();
  const attemptStatus = status === "sent" ? "sent" : "failed";

  await admin
    .from("notifications")
    .update({
      last_email_attempt_at: attemptAt,
      last_email_attempt_status: attemptStatus,
      last_email_attempt_error: errorMessage,
    })
    .eq("id", payload.eventId);

  await admin.from("notification_email_sends").insert({
    event_id: payload.eventId,
    user_id: payload.userId,
    type: payload.type,
    promise_id: payload.promiseId,
    status,
    provider,
    provider_id: options?.providerId ?? null,
    dedupe_key: payload.dedupeKey,
    error_message: errorMessage,
    to_email: options?.toEmail ?? null,
  });

  const logData = {
    eventType: payload.type,
    eventId: payload.eventId,
    userId: payload.userId,
    dedupeKey: payload.dedupeKey,
    status,
    provider,
    providerMessageId: options?.providerId ?? null,
    toEmail: options?.toEmail ?? null,
    error: errorMessage,
  };

  if (status === "sent") {
    console.info("[notifications] email_send", logData);
    return;
  }

  console.error("[notifications] email_send", logData);
};

export const maybeSendNotificationEmail = async (admin: SupabaseClient, payload: EmailPayload) => {
  if (!EMAIL_ELIGIBLE_TYPES.has(payload.type)) {
    return { sent: false, skippedReason: "email_type_not_supported" };
  }

  const now = new Date();

  const { data: existing } = await admin
    .from("notification_email_sends")
    .select("id")
    .eq("user_id", payload.userId)
    .eq("type", payload.type)
    .eq("dedupe_key", payload.dedupeKey)
    .maybeSingle();

  if (existing?.id) {
    return { sent: false, skippedReason: "dedupe_key_exists" };
  }

  if (await isReminderEmailRateLimited(admin, payload, now)) {
    console.info("[notifications] email_send_skipped_rate_limited", {
      userId: payload.userId,
      promiseId: payload.promiseId,
      type: payload.type,
    });
    return { sent: false, skippedReason: "rate_limited_24h" };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email_notifications_enabled")
    .eq("id", payload.userId)
    .maybeSingle();

  if (profile?.email_notifications_enabled === false) {
    await logEmailSend(admin, payload, "disabled");
    return { sent: false, skippedReason: "email_notifications_disabled" };
  }

  const getUserById = admin.auth?.admin?.getUserById?.bind(admin.auth.admin);
  if (!getUserById) {
    await logEmailSend(admin, payload, "failed", {
      error: "Supabase admin auth.getUserById is unavailable",
    });
    return { sent: false, skippedReason: "resend_failed" };
  }

  const { data: userData, error: userError } = await getUserById(payload.userId);
  const to = userData.user?.email;
  if (userError || !to) {
    await logEmailSend(admin, payload, "failed", {
      error: userError?.message ?? "No recipient email found",
    });
    return { sent: false, skippedReason: "missing_recipient_email" };
  }

  const provider = resolveEmailProvider();
  if (provider === "none") {
    await logEmailSend(admin, payload, "provider_not_configured", {
      provider,
      toEmail: to,
      error: "Missing RESEND_API_KEY",
    });
    return { sent: false, skippedReason: "resend_failed" };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const copy = resolveEmailCopy(payload);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject: copy.subject,
        html: copy.html,
        text: copy.text,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "Unknown provider error");
      await logEmailSend(admin, payload, "failed", {
        provider,
        toEmail: to,
        error: `Resend error ${response.status}: ${responseText}`,
      });
      return { sent: false, skippedReason: "resend_failed" };
    }

    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    await logEmailSend(admin, payload, "sent", {
      provider,
      providerId: body?.id ?? null,
      toEmail: to,
    });
    return { sent: true };
  } catch (error) {
    await logEmailSend(admin, payload, "failed", {
      provider,
      toEmail: to,
      error: error instanceof Error ? error.message : String(error),
    });
    return { sent: false, skippedReason: "resend_failed" };
  }
};

export const isEmailEligibleType = (type: NotificationType) => EMAIL_ELIGIBLE_TYPES.has(type);
export const getConfiguredEmailProvider = resolveEmailProvider;

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
  "due_soon",
  "overdue",
]);

type EmailSendStatus = "sent" | "failed" | "provider_not_configured" | "disabled";
type EmailProvider = "resend" | "none";

type EmailPayload = {
  eventId: string;
  userId: string;
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
    case "reminder_overdue":
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

const logEmailSend = async (
  admin: SupabaseClient,
  payload: EmailPayload,
  status: EmailSendStatus,
  options?: EmailLogOptions
) => {
  const provider = options?.provider ?? resolveEmailProvider();
  const errorMessage = options?.error?.slice(0, 2000) ?? null;

  await admin.from("notification_email_sends").insert({
    event_id: payload.eventId,
    user_id: payload.userId,
    type: payload.type,
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
    return;
  }

  const { data: existing } = await admin
    .from("notification_email_sends")
    .select("id")
    .eq("user_id", payload.userId)
    .eq("type", payload.type)
    .eq("dedupe_key", payload.dedupeKey)
    .maybeSingle();

  if (existing?.id) {
    return;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email_notifications_enabled")
    .eq("id", payload.userId)
    .maybeSingle();

  if (profile?.email_notifications_enabled === false) {
    await logEmailSend(admin, payload, "disabled");
    return;
  }

  const getUserById = admin.auth?.admin?.getUserById?.bind(admin.auth.admin);
  if (!getUserById) {
    await logEmailSend(admin, payload, "failed", {
      error: "Supabase admin auth.getUserById is unavailable",
    });
    return;
  }

  const { data: userData, error: userError } = await getUserById(payload.userId);
  const to = userData.user?.email;
  if (userError || !to) {
    await logEmailSend(admin, payload, "failed", {
      error: userError?.message ?? "No recipient email found",
    });
    return;
  }

  const provider = resolveEmailProvider();
  if (provider === "none") {
    await logEmailSend(admin, payload, "provider_not_configured", {
      provider,
      toEmail: to,
      error: "Missing RESEND_API_KEY",
    });
    return;
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
      return;
    }

    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    await logEmailSend(admin, payload, "sent", {
      provider,
      providerId: body?.id ?? null,
      toEmail: to,
    });
  } catch (error) {
    await logEmailSend(admin, payload, "failed", {
      provider,
      toEmail: to,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const isEmailEligibleType = (type: NotificationType) => EMAIL_ELIGIBLE_TYPES.has(type);
export const getConfiguredEmailProvider = resolveEmailProvider;

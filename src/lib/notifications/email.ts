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

type EmailPayload = {
  eventId: string;
  userId: string;
  type: NotificationType;
  dedupeKey: string;
  ctaUrl: string;
  title: string;
  body: string;
};

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const getEmailProviderHealth = () => {
  const configured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  return {
    configured,
    status: configured ? "configured" : "not_configured",
  } as const;
};

const absoluteUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) return path;
  return `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
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
  meta?: {
    providerId?: string | null;
    toEmail?: string | null;
    errorMessage?: string | null;
    providerResponse?: unknown;
  }
) => {
  await admin.from("notification_email_sends").insert({
    event_id: payload.eventId,
    user_id: payload.userId,
    type: payload.type,
    status,
    provider_id: meta?.providerId ?? null,
    dedupe_key: payload.dedupeKey,
    to_email: meta?.toEmail ?? null,
    error_message: meta?.errorMessage ?? null,
    provider_response: meta?.providerResponse ?? null,
  });
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
    await logEmailSend(admin, payload, "disabled", {
      errorMessage: "Email notifications are disabled by user preference",
    });
    return;
  }

  const getUserById = admin.auth?.admin?.getUserById?.bind(admin.auth.admin);
  if (!getUserById) {
    await logEmailSend(admin, payload, "failed");
    return;
  }

  const { data: userData, error: userError } = await getUserById(payload.userId);
  const to = userData.user?.email;
  if (userError || !to) {
    await logEmailSend(admin, payload, "failed", {
      errorMessage: userError?.message ?? "Recipient email is missing",
    });
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  const providerHealth = getEmailProviderHealth();
  if (!providerHealth.configured || !resendApiKey || !fromAddress) {
    await logEmailSend(admin, payload, "provider_not_configured", {
      toEmail: to,
      errorMessage: "RESEND_API_KEY or RESEND_FROM_EMAIL is missing",
    });
    return;
  }

  const copy = resolveEmailCopy(payload);

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
    const providerResponse = (await response.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const providerError =
      typeof providerResponse?.message === "string"
        ? providerResponse.message
        : `Resend rejected request (HTTP ${response.status})`;
    await logEmailSend(admin, payload, "failed", {
      toEmail: to,
      errorMessage: providerError,
      providerResponse,
    });
    return;
  }

  const body = (await response.json().catch(() => null)) as { id?: string } | null;
  await logEmailSend(admin, payload, "sent", {
    providerId: body?.id ?? null,
    toEmail: to,
    providerResponse: body,
  });

  console.info("[notifications] email_sent", {
    userId: payload.userId,
    eventId: payload.eventId,
    type: payload.type,
    toEmail: to,
    providerId: body?.id ?? null,
    status: "sent",
  });
};

export const isEmailEligibleType = (type: NotificationType) => EMAIL_ELIGIBLE_TYPES.has(type);

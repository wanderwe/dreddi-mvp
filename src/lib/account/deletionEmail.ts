import type { SupabaseClient } from "@supabase/supabase-js";

// The one letter a deletion request sends: when the account goes, and that signing in restores it.
// Sent straight through Resend, outside the notification pipeline (which skips deleted accounts).

type Locale = "uk" | "en";

const COPY: Record<Locale, { subject: string; body: (date: string, link: string) => string; dateLocale: string }> = {
  uk: {
    subject: "Ваш акаунт Dreddi буде видалено",
    body: (date, link) =>
      `Ми отримали запит на видалення акаунта. Його буде видалено ${date}. Якщо передумаєте, просто увійдіть на ${link} і відновіть акаунт.`,
    dateLocale: "uk-UA",
  },
  en: {
    subject: "Your Dreddi account will be deleted",
    body: (date, link) =>
      `We received a request to delete your account. It will be deleted on ${date}. If you change your mind, just sign in at ${link} and restore it.`,
    dateLocale: "en-US",
  },
};

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://www.dreddi.com";

export async function sendAccountDeletionEmail(
  admin: SupabaseClient,
  userId: string,
  deletesAt: Date,
  locale: string
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const to = userData.user?.email;
  if (!to) return;

  const copy = COPY[locale === "uk" ? "uk" : "en"];
  const date = new Intl.DateTimeFormat(copy.dateLocale, { day: "numeric", month: "long", year: "numeric" }).format(
    deletesAt
  );
  const url = appUrl();
  const host = url.replace(/^https?:\/\/(www\.)?/, "");
  const text = copy.body(date, host);
  const html = `
  <div style="font-family: Inter, -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; line-height: 1.5;">
    <p style="font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #065f46; margin: 0 0 12px;">Dreddi</p>
    <h1 style="font-size: 20px; margin: 0 0 12px;">${copy.subject}</h1>
    <p style="font-size: 15px; margin: 0;">${copy.body(date, `<a href="${url}">${host}</a>`)}</p>
  </div>`.trim();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
        to: [to],
        subject: copy.subject,
        html,
        text: `Dreddi\n\n${copy.subject}\n\n${text}`,
      }),
    });
    if (!response.ok) {
      console.error("[account] deletion_email_failed", { userId, status: response.status });
    }
  } catch (error) {
    console.error("[account] deletion_email_failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

import type { Metadata } from "next";
import { getInviteCard } from "@/lib/quickDisputes/server";
import { getMessages } from "@/lib/i18n/getMessages";
import { createTranslator } from "@/lib/i18n/t";
import { localizePath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/locales";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.dreddi.com";

// The preview of an invite link in messengers: the question and who is calling, so the opponent knows
// what the link is before opening it. The position stays inside.
export const disputeFallback = (title: string, description: string): Metadata => ({
  title: `${title} · Dreddi`,
  description,
  robots: { index: false },
  openGraph: { title, description, type: "website", siteName: "Dreddi" },
  twitter: { card: "summary", title, description },
});

export async function buildInviteMetadata(token: string, locale: Locale): Promise<Metadata> {
  const card = await getInviteCard(token);
  const t = createTranslator(locale, getMessages(locale));
  // Could not read it: still say it is a dispute, never the site's general text, which a messenger
  // would then keep for this link.
  if (!card) return disputeFallback(t("decide.title"), t("decide.join.previewFallback"));
  const title = card.question;
  const description = t("decide.join.title", { nickname: card.nicknameA });
  const url = new URL(localizePath(`/decide/join/${token}`, locale), SITE_URL).toString();
  const image = {
    url: new URL(`/api/og/decide/invite/${encodeURIComponent(token)}?locale=${locale}`, SITE_URL).toString(),
    width: 1200,
    height: 630,
    alt: card.question,
  };
  return {
    title: `${title} · Dreddi`,
    description,
    robots: { index: false },
    openGraph: { title, description, type: "website", url, siteName: "Dreddi", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

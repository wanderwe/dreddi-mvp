import type { Metadata } from "next";
import { getChatCard } from "@/lib/chatDisputes/server";
import { getMessages } from "@/lib/i18n/getMessages";
import { createTranslator } from "@/lib/i18n/t";
import { localizePath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/locales";
import { disputeFallback } from "@/app/decide/join/[token]/invite";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.dreddi.com";

// The preview of a chat dispute link in messengers: while open, the situation and the two positions;
// once decided, Dreddi's answer. Never what people wrote.
export async function buildChatMetadata(token: string, locale: Locale): Promise<Metadata> {
  const card = await getChatCard(token);
  const t = createTranslator(locale, getMessages(locale));
  if (!card) return disputeFallback(t("decide.title"), t("decide.format.chatHint"));
  const title = card.question;
  const description = card.verdict ? card.verdict.short_answer : `${card.positions[1]} · ${card.positions[2]}. ${t("decide.format.chatHint")}`;
  const url = new URL(localizePath(`/decide/c/${token}`, locale), SITE_URL).toString();
  const image = {
    url: new URL(`/api/og/decide/c/${encodeURIComponent(token)}?locale=${locale}`, SITE_URL).toString(),
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

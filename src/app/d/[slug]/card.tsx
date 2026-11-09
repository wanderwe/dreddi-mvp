import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicCard } from "@/lib/quickDisputes/server";
import { getMessages } from "@/lib/i18n/getMessages";
import { createTranslator } from "@/lib/i18n/t";
import { localizePath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/locales";
import { VerdictCard, verdictHeadline } from "@/app/decide/VerdictCard";
import { ShareVerdict } from "./ShareVerdict";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dreddi.com";

// The public card of a «Дредді розсуди» verdict: the question, the nicknames and the verdict, never the positions.

export async function buildQuickCardMetadata(slug: string, locale: Locale): Promise<Metadata> {
  const card = await getPublicCard(slug);
  if (!card) return {};
  const t = createTranslator(locale, getMessages(locale));
  const description = `${verdictHeadline(card.verdict, { A: card.nicknameA, B: card.nicknameB }, t)}. ${card.verdict.short_answer}`;
  const url = new URL(localizePath(`/d/${slug}`, locale), SITE_URL).toString();
  const image = {
    url: new URL(`/api/og/decide/${encodeURIComponent(slug)}?locale=${locale}`, SITE_URL).toString(),
    width: 1200,
    height: 630,
    alt: card.question,
  };
  return {
    title: `${card.question} · Dreddi`,
    description,
    robots: { index: false },
    openGraph: { title: card.question, description, type: "website", url, siteName: "Dreddi", images: [image] },
    twitter: { card: "summary_large_image", title: card.question, description, images: [image.url] },
  };
}

export async function QuickCardPage({ slug, locale }: { slug: string; locale: Locale }) {
  const card = await getPublicCard(slug);
  if (!card) notFound();
  const t = createTranslator(locale, getMessages(locale));
  return (
    <main className="relative min-h-screen bg-gradient-to-b from-tone-950 via-[var(--page-wash-via)] to-[var(--page-wash-to)] text-tone-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="relative flex min-h-screen items-start justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-2xl space-y-5 rounded-3xl border border-tone-white/10 bg-tone-black/40 p-5 shadow-2xl shadow-tone-black/40 backdrop-blur sm:p-8">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-accent-200">{t("decide.title")}</p>
            <h1 className="text-2xl font-semibold text-tone-white sm:text-3xl">{card.question}</h1>
            <p className="text-sm text-tone-400">
              {card.nicknameA} · {card.nicknameB}
            </p>
          </div>
          <VerdictCard verdict={card.verdict} nicknames={{ A: card.nicknameA, B: card.nicknameB }} t={t} />
          <ShareVerdict question={card.question} shareText={card.verdict.share_text} />
        </div>
      </div>
    </main>
  );
}

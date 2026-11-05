import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale } from "@/lib/i18n/getLocale";
import { type Locale } from "@/lib/i18n/locales";
import { localizePath } from "@/lib/i18n/routing";
import { getMessages } from "@/lib/i18n/getMessages";
import { createTranslator } from "@/lib/i18n/t";
import { lookupAgreementPreview } from "@/lib/agreementPreview";
import { formatKyivDate } from "@/lib/ai/kyivDate";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dreddi.com";

// A shared link to a public promise shows what was promised, its status and the deadline, with a picture.
export async function buildAgreementMetadata(id: string, locale: Locale): Promise<Metadata> {
  const preview = await lookupAgreementPreview(id);
  if (!preview) return {};

  const t = createTranslator(locale, getMessages(locale));
  const description = [
    preview.executorName,
    t(`publicAgreement.status.${preview.uiStatus}`),
    preview.dueAt
      ? t("publicAgreement.deadline", {
          date: formatKyivDate(new Date(preview.dueAt), locale === "uk" ? "uk-UA" : "en-US"),
        })
      : null,
    preview.verdict
      ? `${t("publicAgreement.dreddi.title")}: ${t(`publicAgreement.dreddi.verdict.${preview.verdict}`)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const path = `/p/agreements/${encodeURIComponent(id)}`;
  const url = new URL(localizePath(path, locale), SITE_URL).toString();
  const image = {
    url: new URL(`/api/og/agreement/${encodeURIComponent(id)}?locale=${locale}`, SITE_URL).toString(),
    width: 1200,
    height: 630,
    alt: preview.title,
  };

  return {
    title: `${preview.title} · Dreddi`,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: new URL(localizePath(path, "en"), SITE_URL).toString(),
        uk: new URL(localizePath(path, "uk"), SITE_URL).toString(),
      },
    },
    openGraph: {
      title: preview.title,
      description,
      type: "website",
      url,
      siteName: "Dreddi",
      locale: locale === "uk" ? "uk_UA" : "en_US",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: preview.title,
      description,
      images: [image.url],
    },
  };
}

export async function generateMetadata(ctx: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await ctx.params;
  return buildAgreementMetadata(id, await getLocale());
}

export default function AgreementLayout({ children }: { children: ReactNode }) {
  return children;
}

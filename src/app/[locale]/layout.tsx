import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppFooter } from "@/app/components/AppFooter";
import { AppHeader } from "@/app/components/AppHeader";
import { DocumentLanguageSync } from "@/app/components/DocumentLanguageSync";
import { POSITIONING } from "@/lib/features";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getMessages } from "@/lib/i18n/getMessages";
import { localizePath } from "@/lib/i18n/routing";
import { resolveRouteLocale } from "@/lib/i18n/resolveRouteLocale";

const CLASSIC_OG_COPY = {
  en: {
    title: "Dreddi",
    description: "Track agreements, confirm outcomes, build reputation.",
    locale: "en_US",
  },
  uk: {
    title: "Dreddi",
    description: "Фіксуйте домовленості, підтверджуйте результати, будуйте репутацію.",
    locale: "uk_UA",
  },
};

const PLEDGE_OG_COPY = {
  en: {
    title: "Promised? Dreddi knows",
    description: "Record promises to yourself and agreements with others: what, by when, and who’s responsible. A kept word becomes your reputation.",
    locale: "en_US",
  },
  uk: {
    title: "Пообіцяв? Dreddi знає",
    description: "Записуй обіцянки собі й домовленості з людьми: що саме, до коли і хто відповідає. Дотримане слово стає твоєю репутацією.",
    locale: "uk_UA",
  },
};

const OG_COPY = POSITIONING === "pledge" ? PLEDGE_OG_COPY : CLASSIC_OG_COPY;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveRouteLocale((await params).locale);
  const copy = OG_COPY[locale] ?? OG_COPY.en;

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: localizePath("/", locale),
      languages: {
        en: localizePath("/", "en"),
        uk: localizePath("/", "uk"),
      },
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      locale: copy.locale,
      type: "website",
    },
    twitter: {
      title: copy.title,
      description: copy.description,
      card: "summary",
    },
  };
}

export default async function LocalizedLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const locale = resolveRouteLocale((await params).locale);
  const messages = getMessages(locale);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen flex-col">
        <DocumentLanguageSync locale={locale} />
        <AppHeader />
        <div className="flex-1">{children}</div>
        <AppFooter />
      </div>
    </I18nProvider>
  );
}

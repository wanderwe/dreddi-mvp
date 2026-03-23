import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppFooter } from "@/app/components/AppFooter";
import { AppHeader } from "@/app/components/AppHeader";
import { DocumentLanguageSync } from "@/app/components/DocumentLanguageSync";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getMessages } from "@/lib/i18n/getMessages";
import { localizePath } from "@/lib/i18n/routing";
import { resolveRouteLocale } from "@/lib/i18n/resolveRouteLocale";

const OG_COPY = {
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
      <DocumentLanguageSync locale={locale} />
      <AppHeader />
      {children}
      <AppFooter />
    </I18nProvider>
  );
}

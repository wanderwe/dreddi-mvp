import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getLocale } from "@/lib/i18n/getLocale";
import { getMessages } from "@/lib/i18n/getMessages";
import { AppFooter } from "@/app/components/AppFooter";
import { AppHeader } from "@/app/components/AppHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = OG_COPY[locale] ?? OG_COPY.en;

  return {
    title: copy.title,
    description: copy.description,
    openGraph: {
      title: copy.title,
      description: copy.description,
      locale: copy.locale,
      type: "website",
    },
    twitter: {
      title: copy.title,
      description: copy.description,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages(locale);

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider locale={locale} messages={messages}>
          <AppHeader />
          {children}
          <AppFooter />
        </I18nProvider>
      </body>
    </html>
  );
}

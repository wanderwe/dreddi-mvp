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

const OG_IMAGE_URL = "https://dreddi.com/og.png";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = OG_COPY[locale] ?? OG_COPY.en;

  return {
    title: copy.title,
    description: copy.description,
    metadataBase: new URL("https://dreddi.com"),
    openGraph: {
      title: copy.title,
      description: copy.description,
      locale: copy.locale,
      type: "website",
      images: [
        {
          url: OG_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: "Dreddi",
        },
      ],
    },
    twitter: {
      title: copy.title,
      description: copy.description,
      card: "summary_large_image",
      images: [OG_IMAGE_URL],
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

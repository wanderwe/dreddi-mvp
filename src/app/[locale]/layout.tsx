import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";

import { geistMono, geistSans } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Dreddi knows",
  description: "Promises tracked. Reputation earned.",
};

async function loadMessages(locale: string) {
  try {
    const messages = await import(`@/i18n/messages/${locale}.json`);
    return messages.default;
  } catch (error) {
    console.error(`Unable to load messages for locale: ${locale}`, error);
    return {};
  }
}

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  const messages = await loadMessages(locale);

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import { LIGHT_THEME_ENABLED } from "@/lib/features";
import { getLocale } from "@/lib/i18n/getLocale";
import {
  THEME_COLORS,
  THEME_STORAGE_KEY,
  isThemeExcludedPath,
  parseTheme,
  themeInitScript,
} from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dreddi.com"),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  const body = (
    <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
  );

  if (!LIGHT_THEME_ENABLED || isThemeExcludedPath((await headers()).get("x-dreddi-pathname"))) {
    return <html lang={locale}>{body}</html>;
  }

  // The cookie carries the saved choice; without one the visitor gets the light default.
  const serverTheme = parseTheme((await cookies()).get(THEME_STORAGE_KEY)?.value);

  return (
    <html
      lang={locale}
      data-theme={serverTheme}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content={THEME_COLORS[serverTheme]} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      {body}
    </html>
  );
}

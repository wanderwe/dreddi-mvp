import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import { LIGHT_THEME_ENABLED } from "@/lib/features";
import { getLocale } from "@/lib/i18n/getLocale";
import {
  THEME_COLORS,
  THEME_STORAGE_KEY,
  isThemeExcludedPath,
  parseThemePreference,
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

  // An explicit choice is known from the cookie; "system" is resolved by themeInitScript before paint.
  const preference = parseThemePreference((await cookies()).get(THEME_STORAGE_KEY)?.value);
  const serverTheme = preference === "system" ? undefined : preference;

  return (
    <html
      lang={locale}
      data-theme={serverTheme}
      data-theme-preference={preference}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content={THEME_COLORS[serverTheme ?? "dark"]} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      {body}
    </html>
  );
}

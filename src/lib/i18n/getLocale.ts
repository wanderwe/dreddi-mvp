import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE_NAME, Locale, defaultLocale, normalizeLocale } from "./locales";

const parseAcceptLanguage = (value: string | null): Locale | null => {
  if (!value) return null;

  for (const part of value.split(",")) {
    const [lang] = part.trim().split(";");
    const locale = normalizeLocale(lang);
    if (locale) return locale;
  }

  return null;
};

export const getLocale = (): Locale => {
  const cookieLocale = normalizeLocale(cookies().get(LOCALE_COOKIE_NAME)?.value);
  if (cookieLocale) return cookieLocale;

  const headerLocale = parseAcceptLanguage(headers().get("accept-language"));
  if (headerLocale) return headerLocale;

  return defaultLocale;
};

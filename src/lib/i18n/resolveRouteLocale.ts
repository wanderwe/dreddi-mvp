import { notFound } from "next/navigation";
import { Locale, normalizeLocale } from "./locales";

export function resolveRouteLocale(localeParam: string): Locale {
  const locale = normalizeLocale(localeParam);

  if (!locale) {
    notFound();
  }

  return locale;
}

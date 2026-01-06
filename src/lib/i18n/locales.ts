export const LOCALE_COOKIE_NAME = "dreddi_locale" as const;

export const locales = ["en", "uk"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (locales as readonly string[]).includes(value);

export const normalizeLocale = (value: string | undefined | null): Locale | null => {
  if (!value) return null;
  const base = value.toLowerCase().split(/[._-]/)[0];
  return isLocale(base) ? base : null;
};

import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE_NAME, Locale, defaultLocale, normalizeLocale } from "./locales";

export function getLocale(): Locale {
  const cookieStore = cookies();

  // IMPORTANT:
  // Do NOT use cookies().get() here.
  // In Next.js App Router (especially with Turbopack),
  // cookies() does not reliably expose `.get()`.
  // Always use getAll() + manual lookup.
  const localeCookie = cookieStore
    .getAll()
    .find((cookie) => cookie.name === LOCALE_COOKIE_NAME)?.value;

  const normalizedCookie = normalizeLocale(localeCookie);
  if (normalizedCookie) {
    return normalizedCookie;
  }

  const acceptLanguage = headers().get("accept-language");
  if (acceptLanguage) {
    const [preferredLocale] = acceptLanguage.split(",");
    const normalizedHeaderLocale = normalizeLocale(preferredLocale);
    if (normalizedHeaderLocale) {
      return normalizedHeaderLocale;
    }
  }

  return defaultLocale;
}

export { LOCALE_COOKIE_NAME };

import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE_NAME, Locale, defaultLocale, normalizeLocale } from "./locales";
import { detectLocaleFromAcceptLanguage } from "./routing";

export async function getLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  const pathnameLocale = normalizeLocale(requestHeaders.get("x-dreddi-locale"));
  if (pathnameLocale) {
    return pathnameLocale;
  }

  // IMPORTANT:
  // Do NOT use cookies().get() here.
  // In Next.js App Router (especially with Turbopack),
  // cookies() may be async and does not reliably expose `.get()`.
  // Always await cookies() and use getAll() + manual lookup.
  const cookieStore = await cookies();

  const localeCookie = cookieStore
    .getAll()
    .find((cookie) => cookie.name === LOCALE_COOKIE_NAME)?.value;

  const normalizedCookie = normalizeLocale(localeCookie);
  if (normalizedCookie) {
    return normalizedCookie;
  }

  const acceptLanguage = requestHeaders.get("accept-language");
  if (acceptLanguage) return detectLocaleFromAcceptLanguage(acceptLanguage);

  return defaultLocale;
}

export { LOCALE_COOKIE_NAME };

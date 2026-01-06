import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE_NAME, Locale, defaultLocale, normalizeLocale } from "./locales";

export async function getLocale(): Promise<Locale> {
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

  const acceptLanguage = (await headers()).get("accept-language");
  if (acceptLanguage) {
    // Example: "en-US,en;q=0.9,uk;q=0.8"
    const [preferred] = acceptLanguage.split(",");
    const lang = preferred?.trim().split(";")[0]; // drop q=...
    const normalizedHeaderLocale = normalizeLocale(lang);
    if (normalizedHeaderLocale) {
      return normalizedHeaderLocale;
    }
  }

  return defaultLocale;
}

export { LOCALE_COOKIE_NAME };

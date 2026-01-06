import { cookies, headers } from "next/headers";

const DEFAULT_LOCALE = "en";
const LOCALE_COOKIE_NAME = "locale";

export function getLocale(): string {
  const cookieStore = cookies();

  // IMPORTANT:
  // Do NOT use cookies().get() here.
  // In Next.js App Router (especially with Turbopack),
  // cookies() does not reliably expose `.get()`.
  // Always use getAll() + manual lookup.
  const localeCookie = cookieStore
    .getAll()
    .find((cookie) => cookie.name === LOCALE_COOKIE_NAME)?.value;

  if (localeCookie) {
    return localeCookie;
  }

  const acceptLanguage = headers().get("accept-language");
  if (acceptLanguage) {
    const [preferredLocale] = acceptLanguage.split(",");
    if (preferredLocale) {
      return preferredLocale;
    }
  }

  return DEFAULT_LOCALE;
}

export { DEFAULT_LOCALE, LOCALE_COOKIE_NAME };

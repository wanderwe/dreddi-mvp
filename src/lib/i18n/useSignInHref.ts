"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/I18nProvider";
import { extractLocaleFromPathname, localizeLoginPath, localizePath } from "@/lib/i18n/routing";

// The header's "Sign in" link: back to the page it was pressed on (an invite, a public promise),
// not to the home page. The home page and the login page itself need no return address.
export function useSignInHref(): string {
  const locale = useLocale();
  const pathname = usePathname();
  const path = extractLocaleFromPathname(pathname || "/").pathnameWithoutLocale;
  if (path === "/" || path === "/login") return localizePath("/login", locale);
  return localizeLoginPath(localizePath(path, locale), locale);
}

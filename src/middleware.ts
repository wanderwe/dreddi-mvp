import { NextRequest, NextResponse } from "next/server";
import {
  getLocalePathname,
  LOCALE_COOKIE_NAME,
  normalizeLocale,
} from "@/lib/i18n/locales";
import {
  detectLocaleFromAcceptLanguage,
  extractLocaleFromPathname,
  localizePath,
} from "@/lib/i18n/routing";

function resolvePreferredLocale(request: NextRequest) {
  const cookieLocale = normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value);
  if (cookieLocale) return cookieLocale;
  return detectLocaleFromAcceptLanguage(request.headers.get("accept-language"));
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const { locale, localeSegment, pathnameWithoutLocale } = extractLocaleFromPathname(pathname);

  if (!locale) {
    const preferredLocale = resolvePreferredLocale(request);
    const localizedPath = localizePath(pathname, preferredLocale);
    return NextResponse.redirect(new URL(`${localizedPath}${search}`, request.url));
  }

  const canonicalLocaleSegment = getLocalePathname(locale);
  if (localeSegment !== canonicalLocaleSegment) {
    const localizedPath = localizePath(pathname, locale);
    return NextResponse.redirect(new URL(`${localizedPath}${search}`, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-dreddi-locale", locale);

  const rewrittenUrl = request.nextUrl.clone();
  rewrittenUrl.pathname = pathnameWithoutLocale;

  const response = NextResponse.rewrite(rewrittenUrl, {
    request: {
      headers: requestHeaders,
    },
  });

  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

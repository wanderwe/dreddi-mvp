import {
  Locale,
  defaultLocale,
  getLocalePathname,
  locales,
  normalizeLocale,
} from "./locales";

const LOCALE_PREFIX_RE = /^\/([a-zA-Z-]+)(?=\/|$)/;

export const extractLocaleFromPathname = (
  pathname: string
): { locale: Locale | null; localeSegment: string | null; pathnameWithoutLocale: string } => {
  const match = pathname.match(LOCALE_PREFIX_RE);
  if (!match) {
    return { locale: null, localeSegment: null, pathnameWithoutLocale: pathname || "/" };
  }

  const normalized = normalizeLocale(match[1]);
  if (!normalized) {
    return { locale: null, localeSegment: null, pathnameWithoutLocale: pathname || "/" };
  }

  const rest = pathname.slice(match[0].length);
  return {
    locale: normalized,
    localeSegment: match[1].toLowerCase(),
    pathnameWithoutLocale: rest.length > 0 ? rest : "/",
  };
};

export const localizePath = (pathname: string, locale: Locale): string => {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const { pathnameWithoutLocale } = extractLocaleFromPathname(normalizedPath);
  const localePathname = getLocalePathname(locale);
  return `/${localePathname}${pathnameWithoutLocale === "/" ? "" : pathnameWithoutLocale}`;
};

export const switchLocaleInPath = (pathname: string, nextLocale: Locale): string =>
  localizePath(pathname, nextLocale);

export const localizeLoginPath = (nextPath: string, locale: Locale): string =>
  `${localizePath("/login", locale)}?next=${encodeURIComponent(nextPath)}`;

export const detectLocaleFromAcceptLanguage = (headerValue: string | null): Locale => {
  if (!headerValue) return defaultLocale;

  const candidates = headerValue
    .split(",")
    .map((chunk) => normalizeLocale(chunk.trim().split(";")[0]))
    .filter((value): value is Locale => Boolean(value));

  return candidates.find((candidate) => locales.includes(candidate)) ?? defaultLocale;
};

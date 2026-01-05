import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["en", "uk"] as const;
const SKIP_PREFIXES = ["/api", "/_next", "/auth", "/p"];
const PUBLIC_FILE = /\.(.*)$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_FILE.test(pathname)
  ) {
    return;
  }

  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0];

  if (!LOCALES.includes(locale as (typeof LOCALES)[number])) {
    const url = request.nextUrl.clone();
    url.pathname = `/${LOCALES[0]}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/(?!_next/static)(?!_next/image)(?!favicon\\.ico)(?!robots\\.txt).+"],
};

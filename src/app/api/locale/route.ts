import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE_NAME, Locale, isLocale } from "@/lib/i18n/locales";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const locale: Locale | null = isLocale(body?.locale) ? body.locale : null;

  if (!locale) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  cookies().set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

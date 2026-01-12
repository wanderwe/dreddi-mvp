import { LOCALE_COOKIE_NAME, Locale, isLocale } from "@/lib/i18n/locales";
import { NextResponse } from "next/server";
import { getAdminClient, requireUser } from "@/app/api/promises/[id]/common";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const locale: Locale | null = isLocale(body?.locale) ? body.locale : null;

  if (!locale) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });

  // Route Handlers cannot rely on cookies().set() because cookies may be async/readonly
  // in the App Router; setting cookies via the response object is the only safe option.
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  const user = await requireUser(request);
  if (!(user instanceof NextResponse)) {
    const admin = getAdminClient();
    await admin.from("profiles").update({ locale }).eq("id", user.id);
  }

  return response;
}

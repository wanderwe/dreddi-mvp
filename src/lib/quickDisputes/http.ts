import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JudgeError } from "@/lib/ai/askJudge";
import { requireUser } from "@/lib/auth/requireUser";
import { SECRET_COOKIE, SECRET_COOKIE_MAX_AGE, adoptBrowserDisputes, makeIdentity, type Identity } from "./server";

// Server only: the «Дредді розсуди» routes share this. Whoever calls is signed in or not; either way the
// browser gets a random token cookie, so an anonymous side can come back to their dispute.

export async function withIdentity(req: Request, handler: (identity: Identity) => Promise<unknown>) {
  const store = await cookies();
  const user = await requireUser(req, store);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
  const identity = makeIdentity(user instanceof NextResponse ? null : user.id, store.get(SECRET_COOKIE)?.value, ip ?? null);

  await adoptBrowserDisputes(identity).catch(() => undefined);

  let response: NextResponse;
  try {
    response = NextResponse.json(await handler(identity));
  } catch (error) {
    if (!(error instanceof JudgeError)) throw error;
    response = NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (identity.newToken) {
    response.cookies.set(SECRET_COOKIE, identity.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SECRET_COOKIE_MAX_AGE,
    });
  }
  return response;
}

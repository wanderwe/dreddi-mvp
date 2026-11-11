import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/auth/requireUser";

// Right after a Sign in with Apple, the callback hands over Apple's tokens so that deleting the
// account can revoke them later. Kept server side only.
export async function POST(req: Request) {
  const user = await requireUser(req, await cookies());
  if (user instanceof NextResponse) return user;

  const isAppleUser = (user.identities ?? []).some((identity) => identity.provider === "apple");
  if (!isAppleUser) return NextResponse.json({ stored: false });

  const body = (await req.json().catch(() => null)) as
    | { refreshToken?: string | null; accessToken?: string | null }
    | null;
  const refreshToken = body?.refreshToken?.trim() || null;
  const accessToken = body?.accessToken?.trim() || null;
  if (!refreshToken && !accessToken) return NextResponse.json({ stored: false });

  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from("apple_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle<{ refresh_token: string | null }>();

  const { error } = await admin.from("apple_tokens").upsert(
    {
      user_id: user.id,
      // Apple gives a refresh token only on some sign-ins: keep the one we have.
      refresh_token: refreshToken ?? existing?.refresh_token ?? null,
      access_token: accessToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("[account] apple_token_store_failed", { userId: user.id, error: error.message });
    return NextResponse.json({ stored: false }, { status: 500 });
  }
  return NextResponse.json({ stored: true });
}

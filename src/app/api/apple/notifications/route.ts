import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAppleNotification } from "@/lib/account/apple";
import { purgeAccount } from "@/lib/account/deletion";

// Sign in with Apple server-to-server notifications (the endpoint set on the App ID com.dreddi.app).
// account-delete: the Apple ID is gone, so nobody can sign in to restore; the account goes at once.
// consent-revoked: the person unlinked Dreddi in their Apple settings; they are signed out.
// email-disabled / email-enabled: the relay address stops or starts forwarding; letters follow it.
export async function POST(req: Request) {
  const raw = await req.text();
  let jws: string | null = null;
  try {
    const parsed = JSON.parse(raw) as { payload?: string };
    jws = parsed.payload ?? null;
  } catch {
    jws = raw.trim() || null;
  }
  if (!jws) return NextResponse.json({ error: "Missing payload" }, { status: 400 });

  const event = await verifyAppleNotification(jws).catch(() => null);
  if (!event) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: userId, error: lookupError } = await admin.rpc("find_user_id_by_apple_sub", {
    p_sub: event.sub,
  });
  if (lookupError) {
    console.error("[apple] notification_lookup_failed", { type: event.type, error: lookupError.message });
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  // Nobody here with that Apple ID: nothing to do, and Apple should not retry.
  if (!userId) return NextResponse.json({ ok: true });

  try {
    switch (event.type) {
      case "account-delete":
        await purgeAccount(admin, userId as string);
        break;
      case "consent-revoked":
        await admin.from("apple_tokens").delete().eq("user_id", userId);
        await admin.rpc("revoke_user_sessions", { p_user: userId });
        break;
      case "email-disabled":
      case "email-enabled":
        await admin
          .from("profiles")
          .update({ email_notifications_enabled: event.type === "email-enabled" })
          .eq("id", userId);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("[apple] notification_failed", {
      type: event.type,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }

  console.info("[apple] notification", { type: event.type, userId });
  return NextResponse.json({ ok: true });
}

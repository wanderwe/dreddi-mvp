import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/auth/requireUser";

// Saves or forgets this device for push notifications. The body is the browser's PushSubscription
// as JSON (POST), or just its endpoint (DELETE).

type SubscriptionBody = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

const validEndpoint = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("https://") && value.length <= 1000;

export async function POST(req: Request) {
  const user = await requireUser(req, await cookies());
  if (user instanceof NextResponse) return user;

  const body = (await req.json().catch(() => null)) as SubscriptionBody | null;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!validEndpoint(body?.endpoint) || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // The same device for another account (someone signed in as someone else) moves to this one.
  const { error } = await supabaseAdmin()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: body!.endpoint,
        p256dh: p256dh.slice(0, 200),
        auth: auth.slice(0, 100),
        user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
      { onConflict: "endpoint" }
    );
  if (error) {
    console.error("[push] subscribe_failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "Could not save the device" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireUser(req, await cookies());
  if (user instanceof NextResponse) return user;

  const body = (await req.json().catch(() => null)) as SubscriptionBody | null;
  if (!validEndpoint(body?.endpoint)) return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });

  await supabaseAdmin().from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", body!.endpoint);
  return NextResponse.json({ ok: true });
}

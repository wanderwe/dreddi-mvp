import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;

    const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anon = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const service = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    // 1) дістаємо bearer
    const auth = _req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const jwt = m?.[1];

    if (!jwt) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    // 2) валідуюємо користувача через anon клієнт
    const authClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);

    if (userErr || !userData.user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const userId = userData.user.id;

    // 3) service client для обходу RLS (сервер only)
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4) шукаємо promise по invite_token
    const { data: p, error: pErr } = await admin
      .from("promises")
      .select("id, creator_id, counterparty_id, invite_token")
      .eq("invite_token", token)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json({ error: "Invite lookup failed", detail: pErr.message }, { status: 500 });
    }

    if (!p) {
      return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
    }

    // не дозволяємо creator самому “accept”
    if (p.creator_id === userId) {
      return NextResponse.json({ error: "Creator cannot accept their own promise" }, { status: 400 });
    }

    // якщо вже прийнято
    if (p.counterparty_id) {
      if (p.counterparty_id === userId) {
        return NextResponse.json({ ok: true, alreadyAccepted: true }, { status: 200 });
      }
      return NextResponse.json({ error: "Already accepted by another user" }, { status: 409 });
    }

    // 5) пишемо counterparty_id
    const { error: upErr } = await admin
      .from("promises")
      .update({ counterparty_id: userId })
      .eq("id", p.id);

    if (upErr) {
      return NextResponse.json({ error: "Accept failed", detail: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "API crashed", message },
      { status: 500 }
    );
  }
}

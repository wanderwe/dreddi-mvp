import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PromiseRow = {
  id: string;
  creator_id: string;
  counterparty_id: string | null;
};

type Status = "active" | "fulfilled" | "broken";
const allowedStatuses = new Set<Status>(["active", "fulfilled", "broken"]);

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anon = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const service = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("authorization") ?? "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const jwt = match?.[1];

    if (!jwt) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const authClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const userId = userData.user.id;

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: promiseRow, error: promiseError } = await admin
      .from("promises")
      .select("id,creator_id,counterparty_id")
      .eq("id", id)
      .maybeSingle<PromiseRow>();

    if (promiseError) {
      return NextResponse.json(
        { error: "Promise lookup failed", detail: promiseError.message },
        { status: 500 }
      );
    }

    if (!promiseRow) {
      return NextResponse.json({ error: "Promise not found" }, { status: 404 });
    }

    const authorized =
      promiseRow.creator_id === userId || promiseRow.counterparty_id === userId;

    if (!authorized) {
      return NextResponse.json(
        { error: "Not allowed to update this promise" },
        { status: 403 }
      );
    }

    let payload: { status?: string };
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const nextStatus = payload.status as Status | undefined;
    if (!nextStatus || !allowedStatuses.has(nextStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from("promises")
      .update({ status: nextStatus })
      .eq("id", promiseRow.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update status", detail: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "API crashed", message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;

    const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const service = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    // service client (server only) to bypass RLS for reading invite by token
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin
      .from("promises")
      .select("id,title,details,due_at,status,created_at,creator_id,counterparty_id,invite_token")
      .eq("invite_token", token)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Invite lookup failed", detail: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
    }

    return NextResponse.json({ promise: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "API crashed", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

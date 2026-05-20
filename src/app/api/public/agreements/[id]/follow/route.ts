import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/requireUser";
import { getAgreementParticipantIds } from "@/lib/agreements/followers";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}


function adminClient() {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const admin = adminClient();

  const { data: agreement } = await admin
    .from("promises")
    .select("id,creator_id,counterparty_id,promisor_id,promisee_id")
    .eq("id", id)
    .eq("visibility", "public")
    .maybeSingle();

  if (!agreement) return NextResponse.json({ error: "Agreement not public" }, { status: 404 });

  if (getAgreementParticipantIds(agreement).has(user.id)) {
    return NextResponse.json({ error: "Participants cannot follow this agreement" }, { status: 403 });
  }

  const { error } = await admin
    .from("agreement_followers")
    .upsert({ agreement_id: id, user_id: user.id }, { onConflict: "agreement_id,user_id", ignoreDuplicates: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ following: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const admin = adminClient();

  const { error } = await admin
    .from("agreement_followers")
    .delete()
    .eq("agreement_id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ following: false });
}

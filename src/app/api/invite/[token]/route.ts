import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

type PromiseInviteRow = {
  id: string;
  title: string;
  details: string | null;
  condition_text: string | null;
  condition_met_at: string | null;
  due_at: string | null;
  status: string;
  created_at: string;
  reward_amount: number | null;
  reward_currency: string | null;
  reward_text: string | null;
  payment_terms: string | null;
  creator_id: string;
  counterparty_id: string | null;
  counterparty_accepted_at: string | null;
  invite_status: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  ignored_at: string | null;
  invite_token: string | null;
  counterparty_contact: string | null;
  visibility: "private" | "public";
};

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;

    const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const service = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: p, error } = await admin
      .from("promises")
      .select(
        "id,title,details,condition_text,condition_met_at,due_at,status,created_at,reward_amount,reward_currency,reward_text,payment_terms,creator_id,counterparty_id,counterparty_accepted_at,invite_status,invited_at,accepted_at,declined_at,ignored_at,invite_token,counterparty_contact,visibility"
      )
      .eq("invite_token", token)
      .maybeSingle<PromiseInviteRow>(); // ✅ якщо TS не любить — прибери generic

    if (error) {
      return NextResponse.json(
        { error: "Invite lookup failed", detail: error.message },
        { status: 500 }
      );
    }

    if (!p) {
      return NextResponse.json(
        { error: "Invite not found or expired" },
        { status: 404 }
      );
    }

    // Resolve creator label (MVP: email via admin API)
    let creator_display_name: string | null = null;
    try {
      const { data: u } = await admin.auth.admin.getUserById(p.creator_id);
      creator_display_name = u.user?.email ?? null;
    } catch {
      creator_display_name = null;
    }

    let counterparty_display_name: string | null = null;
    if (p.counterparty_id) {
      try {
        const { data: profile } = await admin
          .from("profiles")
          .select("display_name,email")
          .eq("id", p.counterparty_id)
          .maybeSingle();
        counterparty_display_name = profile?.display_name?.trim() || profile?.email?.trim() || null;
      } catch {
        counterparty_display_name = null;
      }
    }

    // Return shape that InvitePage expects (flat object)
    return NextResponse.json(
      {
        id: p.id,
        title: p.title,
        details: p.details ?? null,
        condition_text: p.condition_text ?? null,
        condition_met_at: p.condition_met_at ?? null,
        due_at: p.due_at ?? null,
        reward_amount: p.reward_amount ?? null,
        reward_currency: p.reward_currency ?? null,
        reward_text: p.reward_text ?? null,
        payment_terms: p.payment_terms ?? null,
        creator_handle: null,
        creator_display_name,
        creator_id: p.creator_id,
        counterparty_id: p.counterparty_id ?? null,
        counterparty_display_name,
        counterparty_accepted_at: p.counterparty_accepted_at ?? null,
        invite_status: p.invite_status ?? null,
        invited_at: p.invited_at ?? null,
        accepted_at: p.accepted_at ?? null,
        declined_at: p.declined_at ?? null,
        ignored_at: p.ignored_at ?? null,
        counterparty_contact: p.counterparty_contact ?? null,
        visibility: p.visibility ?? "private",
      },
      { status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "API crashed", message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadParticipantCounts, loadParticipantInvite } from "./participantInvites";

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
  acceptance_mode?: "all" | "threshold";
  acceptance_threshold?: number | null;
};

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;

    const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const service = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const participantInvite = await loadParticipantInvite(admin, token);
    if (participantInvite) {
      const { participantCount, acceptedCount } = await loadParticipantCounts(
        admin,
        participantInvite.promise.id
      );

      let creator_display_name: string | null = null;
      try {
        const { data: u } = await admin.auth.admin.getUserById(
          participantInvite.promise.creator_id
        );
        creator_display_name = u.user?.email ?? null;
      } catch {
        creator_display_name = null;
      }

      return NextResponse.json(
        {
          id: participantInvite.promise.id,
          title: participantInvite.promise.title,
          details: participantInvite.promise.details ?? null,
          condition_text: participantInvite.promise.condition_text ?? null,
          condition_met_at: participantInvite.promise.condition_met_at ?? null,
          due_at: participantInvite.promise.due_at ?? null,
          creator_handle: null,
          creator_display_name,
          creator_id: participantInvite.promise.creator_id,
          counterparty_id: participantInvite.participant.participant_id ?? null,
          counterparty_accepted_at: null,
          invite_status: participantInvite.participant.invite_status ?? null,
          invited_at: participantInvite.participant.invited_at ?? null,
          accepted_at: participantInvite.participant.accepted_at ?? null,
          declined_at: participantInvite.participant.declined_at ?? null,
          ignored_at: participantInvite.participant.ignored_at ?? null,
          counterparty_contact: participantInvite.participant.participant_contact ?? null,
          visibility: participantInvite.promise.visibility ?? "private",
          participant_count: participantCount,
          accepted_count: acceptedCount,
          acceptance_mode: participantInvite.promise.acceptance_mode ?? "all",
          acceptance_threshold: participantInvite.promise.acceptance_threshold ?? null,
          is_group_deal: true,
        },
        { status: 200 }
      );
    }

    const { data: p, error } = await admin
      .from("promises")
      .select(
        "id,title,details,condition_text,condition_met_at,due_at,status,created_at,creator_id,counterparty_id,counterparty_accepted_at,invite_status,invited_at,accepted_at,declined_at,ignored_at,invite_token,counterparty_contact,visibility"
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

    // Return shape that InvitePage expects (flat object)
    return NextResponse.json(
      {
        id: p.id,
        title: p.title,
        details: p.details ?? null,
        condition_text: p.condition_text ?? null,
        condition_met_at: p.condition_met_at ?? null,
        due_at: p.due_at ?? null,
        creator_handle: null,
        creator_display_name,
        creator_id: p.creator_id,
        counterparty_id: p.counterparty_id ?? null,
        counterparty_accepted_at: p.counterparty_accepted_at ?? null,
        invite_status: p.invite_status ?? null,
        invited_at: p.invited_at ?? null,
        accepted_at: p.accepted_at ?? null,
        declined_at: p.declined_at ?? null,
        ignored_at: p.ignored_at ?? null,
        counterparty_contact: p.counterparty_contact ?? null,
        visibility: p.visibility ?? "private",
        participant_count: null,
        accepted_count: null,
        acceptance_mode: "all",
        acceptance_threshold: null,
        is_group_deal: false,
      },
      { status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "API crashed", message }, { status: 500 });
  }
}

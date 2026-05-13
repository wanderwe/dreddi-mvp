import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveCounterpartyId } from "@/lib/promiseParticipants";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getAdminClient() {
  return createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type PromisePublicAgreementRecord = {
  id: string;
  title: string | null;
  details: string | null;
  condition_text: string | null;
  is_important: boolean | null;
  status: string | null;
  invite_status: string | null;
  created_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  accepted_at: string | null;
  counterparty_accepted_at: string | null;
  declined_at: string | null;
  ignored_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  creator_id: string;
  counterparty_id: string | null;
  promisor_id: string | null;
  promisee_id: string | null;
  counterparty_contact: string | null;
};

type PublicProfileRecord = {
  id: string;
  display_name: string | null;
  handle: string | null;
};

const isLikelyPrivateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const admin = getAdminClient();

    const { data: promise, error } = await admin
      .from("promises")
      .select(
        "id,title,details,condition_text,is_important,status,invite_status,created_at,due_at,completed_at,confirmed_at,disputed_at,accepted_at,counterparty_accepted_at,declined_at,ignored_at,expires_at,cancelled_at,creator_id,counterparty_id,promisor_id,promisee_id,counterparty_contact"
      )
      .eq("id", id)
      .eq("visibility", "public")
      .maybeSingle<PromisePublicAgreementRecord>();

    if (error) {
      return NextResponse.json(
        { error: "Public agreement lookup failed", detail: error.message },
        { status: 500 }
      );
    }

    if (!promise) {
      return NextResponse.json({ error: "Public agreement not found" }, { status: 404 });
    }

    const counterpartyId = resolveCounterpartyId(promise);
    const profileIds = Array.from(
      new Set([promise.creator_id, counterpartyId].filter((value): value is string => Boolean(value)))
    );

    const profilesById = new Map<string, PublicProfileRecord>();
    if (profileIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id,display_name,handle")
        .in("id", profileIds)
        .returns<PublicProfileRecord[]>();

      for (const profile of profiles ?? []) {
        profilesById.set(profile.id, profile);
      }
    }

    const creatorProfile = profilesById.get(promise.creator_id) ?? null;
    const counterpartyProfile = counterpartyId ? profilesById.get(counterpartyId) ?? null : null;
    const counterpartyContact = promise.counterparty_contact?.trim() ?? "";

    return NextResponse.json({
      id: promise.id,
      title: promise.title,
      details: promise.details,
      condition_text: promise.condition_text,
      is_important: promise.is_important,
      status: promise.status,
      invite_status: promise.invite_status,
      created_at: promise.created_at,
      due_at: promise.due_at,
      completed_at: promise.completed_at,
      confirmed_at: promise.confirmed_at,
      disputed_at: promise.disputed_at,
      accepted_at: promise.accepted_at,
      counterparty_accepted_at: promise.counterparty_accepted_at,
      declined_at: promise.declined_at,
      ignored_at: promise.ignored_at,
      expires_at: promise.expires_at,
      cancelled_at: promise.cancelled_at,
      creator_display_name: creatorProfile?.display_name ?? null,
      creator_handle: creatorProfile?.handle ?? null,
      counterparty_display_name: counterpartyProfile?.display_name ?? null,
      counterparty_handle: counterpartyProfile?.handle ?? null,
      counterparty_contact:
        !counterpartyProfile && counterpartyContact && !isLikelyPrivateEmail(counterpartyContact)
          ? counterpartyContact
          : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type ParticipantInviteRecord = {
  invite_id: string;
  invite_token: string;
  participant: {
    id: string;
    promise_id: string;
    participant_id: string | null;
    participant_contact: string | null;
    invite_status: string;
    invited_at: string | null;
    accepted_at: string | null;
    declined_at: string | null;
    ignored_at: string | null;
  };
  promise: {
    id: string;
    title: string;
    details: string | null;
    condition_text: string | null;
    condition_met_at: string | null;
    due_at: string | null;
    status: string;
    created_at: string;
    creator_id: string;
    visibility: "private" | "public";
    acceptance_mode: "all" | "threshold";
    acceptance_threshold: number | null;
  };
};

export async function loadParticipantInvite(
  admin: SupabaseClient,
  token: string
): Promise<ParticipantInviteRecord | null> {
  const { data } = await admin
    .from("promise_participant_invites")
    .select(
      "id,invite_token,promise_participant_id,promise_participants(id,promise_id,participant_id,participant_contact,invite_status,invited_at,accepted_at,declined_at,ignored_at,promises(id,title,details,condition_text,condition_met_at,due_at,status,created_at,creator_id,visibility,acceptance_mode,acceptance_threshold))"
    )
    .eq("invite_token", token)
    .maybeSingle();

  if (!data) return null;

  const participantEntry = Array.isArray(data.promise_participants)
    ? data.promise_participants[0]
    : data.promise_participants;
  const promiseEntry = Array.isArray(participantEntry?.promises)
    ? participantEntry.promises[0]
    : participantEntry?.promises;

  if (!participantEntry || !promiseEntry) {
    return null;
  }

  return {
    invite_id: data.id,
    invite_token: data.invite_token,
    participant: {
      id: participantEntry.id,
      promise_id: participantEntry.promise_id,
      participant_id: participantEntry.participant_id,
      participant_contact: participantEntry.participant_contact,
      invite_status: participantEntry.invite_status,
      invited_at: participantEntry.invited_at,
      accepted_at: participantEntry.accepted_at,
      declined_at: participantEntry.declined_at,
      ignored_at: participantEntry.ignored_at,
    },
    promise: {
      id: promiseEntry.id,
      title: promiseEntry.title,
      details: promiseEntry.details,
      condition_text: promiseEntry.condition_text,
      condition_met_at: promiseEntry.condition_met_at,
      due_at: promiseEntry.due_at,
      status: promiseEntry.status,
      created_at: promiseEntry.created_at,
      creator_id: promiseEntry.creator_id,
      visibility: promiseEntry.visibility,
      acceptance_mode: promiseEntry.acceptance_mode,
      acceptance_threshold: promiseEntry.acceptance_threshold,
    },
  };
}

export async function loadParticipantCounts(admin: SupabaseClient, promiseId: string) {
  const { data } = await admin
    .from("promise_participants")
    .select("invite_status")
    .eq("promise_id", promiseId);

  const participantCount = data?.length ?? 0;
  const acceptedCount = data?.filter((row) => row.invite_status === "accepted").length ?? 0;

  return { participantCount, acceptedCount };
}

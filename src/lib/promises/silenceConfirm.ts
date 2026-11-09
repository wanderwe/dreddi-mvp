import type { SupabaseClient } from "@supabase/supabase-js";
import { applyReputationForPromiseFinalization } from "@/lib/reputation/applyReputation";
import { resolveConfirmedOnTime } from "@/lib/reputation/onTime";
import { createNotification, mapPriorityForType } from "@/lib/notifications/service";
import { notifyAgreementWatchers } from "@/lib/notifications/watchers";
import { resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";
import type { PromiseRowMin } from "@/lib/promiseTypes";
import { SILENCE } from "./silenceRules";

// Server only: a promise marked done whose other side never answered counts as kept, at half weight,
// and both sides are told. The status moves only from «awaiting review», so a late confirmation or
// dispute that lands first wins.

const PROMISE_COLUMNS =
  "id,title,is_important,status,due_at,completed_at,completed_on_time,creator_id,counterparty_id,promisor_id,promisee_id,confirmed_at,disputed_at,disputed_code,dispute_reason,invite_status,invited_at,accepted_at,counterparty_accepted_at,declined_at,ignored_at";

export async function confirmBySilence(admin: SupabaseClient, promiseId: string, now: Date = new Date()) {
  const { data: before } = await admin.from("promises").select(PROMISE_COLUMNS).eq("id", promiseId).maybeSingle<PromiseRowMin>();
  if (!before || before.status !== "completed_by_promisor" || before.confirmed_at || before.disputed_at) return false;

  const { data: updated, error } = await admin
    .from("promises")
    .update({
      status: "confirmed",
      confirmed_at: now.toISOString(),
      confirmed_by: "silence",
      completed_on_time: resolveConfirmedOnTime(before, undefined, now),
    })
    .eq("id", promiseId)
    .eq("status", "completed_by_promisor")
    .select(PROMISE_COLUMNS)
    .maybeSingle<PromiseRowMin>();
  if (error) throw new Error(`confirm_by_silence_failed: ${error.message}`);
  if (!updated) return false;

  await applyReputationForPromiseFinalization(admin, updated, { weight: SILENCE.weight, verifiedBy: "silence" });

  const executorId = resolveExecutorId(updated);
  const reviewerId = resolveCounterpartyId(updated);
  const ctaUrl = `/promises/${updated.id}`;
  for (const [userId, role] of [
    [executorId, "executor"],
    [reviewerId, "counterparty"],
  ] as const) {
    if (!userId) continue;
    await createNotification(admin, {
      userId,
      promiseId: updated.id,
      type: "completion_auto_confirmed",
      role,
      dedupeKey: `completion_auto_confirmed:${updated.id}:${userId}`,
      ctaUrl,
      priority: mapPriorityForType("completion_auto_confirmed"),
    });
  }
  await notifyAgreementWatchers(admin, updated, "public_agreement_fulfilled");
  return true;
}

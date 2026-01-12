import { SupabaseClient } from "@supabase/supabase-js";
import { isPromiseStatus } from "@/lib/promiseStatus";
import type { PromiseRowMin } from "@/lib/promiseTypes";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import { calcLatePenalty, calcOnTime, calc_score_impact } from "@/lib/reputation/calcScoreImpact";

type ReputationEventKind = "promise_confirmed" | "promise_disputed" | "manual_adjustment";

type EventMeta = {
  promise_title?: string | null;
  completed_at?: string | null;
  confirmed_at?: string | null;
  disputed_at?: string | null;
  due_at?: string | null;
  on_time?: boolean;
  late_penalty?: boolean;
  role?: string;
};

type EventInput = {
  user_id: string;
  promise_id: string;
  kind: ReputationEventKind;
  delta: number;
  meta: EventMeta;
};

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

function computeDeltas(promise: PromiseRowMin): EventInput[] {
  const events: EventInput[] = [];
  const executorId = resolveExecutorId(promise);
  if (!executorId) return events;
  const baseMeta = {
    promise_title: promise.title,
    completed_at: promise.completed_at,
    confirmed_at: promise.confirmed_at,
    disputed_at: promise.disputed_at,
    due_at: promise.due_at,
  };

  const impactInput = {
    status: promise.status,
    due_at: promise.due_at,
    completed_at: promise.completed_at,
  };
  const onTime = calcOnTime(impactInput);
  const late = calcLatePenalty(impactInput);

  if (promise.status === "confirmed") {
    const executorDelta = calc_score_impact(impactInput);
    events.push({
      user_id: executorId,
      promise_id: promise.id,
      kind: "promise_confirmed",
      delta: executorDelta,
      meta: { ...baseMeta, on_time: onTime },
    });

  }

  if (promise.status === "disputed") {
    const executorDelta = calc_score_impact(impactInput);
    events.push({
      user_id: executorId,
      promise_id: promise.id,
      kind: "promise_disputed",
      delta: executorDelta,
      meta: { ...baseMeta, late_penalty: late },
    });

  }

  return events;
}

async function ensureReputationRows(admin: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return;
  const rows = userIds.map((user_id) => ({ user_id }));
  await admin.from("user_reputation").upsert(rows, { onConflict: "user_id", ignoreDuplicates: true });
}

export async function applyReputationForPromiseFinalization(
  admin: SupabaseClient,
  promise: PromiseRowMin
) {
  if (!promise.creator_id) return;
  if (!isPromiseStatus(promise.status)) return;
  if (promise.status !== "confirmed" && promise.status !== "disputed") return;

  const events = computeDeltas(promise);
  if (events.length === 0) return;

  const userIds = Array.from(new Set(events.map((e) => e.user_id)));

  const { data: existing } = await admin
    .from("reputation_events")
    .select("user_id, kind")
    .eq("promise_id", promise.id)
    .in("user_id", userIds)
    .in(
      "kind",
      events.map((e) => e.kind)
    );

  const existingSet = new Set((existing ?? []).map((row) => `${row.user_id}:${row.kind}`));
  const pendingEvents = events.filter((e) => !existingSet.has(`${e.user_id}:${e.kind}`));

  if (pendingEvents.length === 0) return;

  await ensureReputationRows(admin, userIds);

  const { error: insertErr } = await admin.from("reputation_events").insert(pendingEvents);
  if (insertErr) throw new Error(insertErr.message);

  const deltasByUser = new Map<
    string,
    { delta: number; confirmed: number; disputed: number; onTime: number; totalCompleted: number }
  >();

  for (const event of pendingEvents) {
    const prev = deltasByUser.get(event.user_id) ?? {
      delta: 0,
      confirmed: 0,
      disputed: 0,
      onTime: 0,
      totalCompleted: 0,
    };

    if (event.kind === "promise_confirmed" && event.meta?.role !== "counterparty") {
      prev.confirmed += 1;
      if (event.meta.on_time) prev.onTime += 1;
      prev.totalCompleted += 1;
    }

    if (event.kind === "promise_disputed" && event.meta?.role !== "counterparty") {
      prev.disputed += 1;
      prev.totalCompleted += 1;
    }

    prev.delta += event.delta;
    deltasByUser.set(event.user_id, prev);
  }

  for (const [user_id, summary] of deltasByUser.entries()) {
    const { data: repRow, error: repErr } = await admin
      .from("user_reputation")
      .select("score, confirmed_count, disputed_count, on_time_count, total_promises_completed")
      .eq("user_id", user_id)
      .maybeSingle();

    if (repErr) throw new Error(repErr.message);

    const base =
      repRow ?? {
        score: 50,
        confirmed_count: 0,
        disputed_count: 0,
        on_time_count: 0,
        total_promises_completed: 0,
      };

    const nextScore = clampScore((base.score ?? 50) + summary.delta);

    const { error: updateErr } = await admin
      .from("user_reputation")
      .update({
        score: nextScore,
        confirmed_count: (base.confirmed_count ?? 0) + summary.confirmed,
        disputed_count: (base.disputed_count ?? 0) + summary.disputed,
        on_time_count: (base.on_time_count ?? 0) + summary.onTime,
        total_promises_completed: (base.total_promises_completed ?? 0) + summary.totalCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id);

    if (updateErr) throw new Error(updateErr.message);
  }
}

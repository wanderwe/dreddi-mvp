import { NextResponse } from "next/server";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import {
  buildCtaUrl,
  buildDedupeKey,
  createNotification,
  mapPriorityForType,
} from "@/lib/notifications/service";
import { getCompletionFollowupStage } from "@/lib/notifications/policy";

const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_72 = 72 * 60 * 60 * 1000;

type PromiseNotificationState = {
  invite_notified_at?: string | null;
  invite_followup_notified_at?: string | null;
  due_soon_notified_at?: string | null;
  overdue_notified_at?: string | null;
  overdue_creator_notified_at?: string | null;
  completion_notified_at?: string | null;
  completion_followups_count?: number | null;
  completion_cycle_id?: number | null;
  completion_cycle_started_at?: string | null;
  completion_followup_last_at?: string | null;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null | undefined => {
  if (typeof value === "string") return value;
  if (value === null) return null;
  return undefined;
};

const readNumber = (value: unknown): number | null | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null) return null;
  return undefined;
};

const getNotificationState = (raw: unknown): PromiseNotificationState => {
  if (!isPlainRecord(raw)) return {};

  return {
    invite_notified_at: readString(raw.invite_notified_at),
    invite_followup_notified_at: readString(raw.invite_followup_notified_at),
    due_soon_notified_at: readString(raw.due_soon_notified_at),
    overdue_notified_at: readString(raw.overdue_notified_at),
    overdue_creator_notified_at: readString(raw.overdue_creator_notified_at),
    completion_notified_at: readString(raw.completion_notified_at),
    completion_followups_count: readNumber(raw.completion_followups_count),
    completion_cycle_id: readNumber(raw.completion_cycle_id),
    completion_cycle_started_at: readString(raw.completion_cycle_started_at),
    completion_followup_last_at: readString(raw.completion_followup_last_at),
  };
};

const isAccepted = (row: {
  counterparty_accepted_at: string | null;
  promisor_id: string | null;
  promisee_id: string | null;
}) => Boolean(row.counterparty_accepted_at ?? (row.promisor_id && row.promisee_id));

export async function POST(req: Request) {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET;
  const auth = req.headers.get("authorization")?.replace(/Bearer\s+/i, "");
  if (secret && auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const dueSoonCutoff = new Date(now.getTime() + HOURS_24).toISOString();

  const results = {
    inviteFollowups: 0,
    dueSoon: 0,
    overdue: 0,
    completionFollowups: 0,
  };

  const { data: invites } = await admin
    .from("promises")
    .select(
      "id,invite_token,counterparty_id,counterparty_accepted_at,creator_id,promisor_id,promisee_id,promise_notification_state(invite_notified_at,invite_followup_notified_at)"
    )
    .eq("status", "active")
    .is("counterparty_accepted_at", null)
    .not("counterparty_id", "is", null)
    .not("invite_token", "is", null);

  for (const row of invites ?? []) {
    const state = getNotificationState(row.promise_notification_state);
    if (!row.counterparty_id) continue;
    if (!state.invite_notified_at || state.invite_followup_notified_at) continue;

    const notifiedAt = new Date(state.invite_notified_at);
    if (now.getTime() - notifiedAt.getTime() < HOURS_24) continue;

    const created = await createNotification(admin, {
      userId: row.counterparty_id,
      promiseId: row.id,
      type: "N1",
      role: "executor",
      followup: "invite",
      dedupeKey: buildDedupeKey(["N1", row.id, "followup"]),
      ctaUrl: row.invite_token ? `/p/invite/${row.invite_token}` : buildCtaUrl(row.id),
      priority: mapPriorityForType("N1"),
    });

    if (created.created) {
      await admin
        .from("promise_notification_state")
        .upsert({
          promise_id: row.id,
          invite_followup_notified_at: nowIso,
          updated_at: nowIso,
        });
      results.inviteFollowups += 1;
    }
  }

  const { data: dueSoonRows } = await admin
    .from("promises")
    .select(
      "id,due_at,creator_id,counterparty_id,counterparty_accepted_at,promisor_id,promisee_id,promise_notification_state(due_soon_notified_at)"
    )
    .eq("status", "active")
    .gte("due_at", nowIso)
    .lte("due_at", dueSoonCutoff);

  for (const row of dueSoonRows ?? []) {
    if (!row.due_at || !isAccepted(row)) continue;
    const state = getNotificationState(row.promise_notification_state);
    if (state.due_soon_notified_at) continue;
    const executorId = resolveExecutorId(row);
    if (!executorId) continue;

    const created = await createNotification(admin, {
      userId: executorId,
      promiseId: row.id,
      type: "N3",
      role: "executor",
      dedupeKey: buildDedupeKey(["N3", row.id]),
      ctaUrl: buildCtaUrl(row.id),
      priority: mapPriorityForType("N3"),
      requiresDeadlineReminder: true,
    });

    if (created.created) {
      await admin
        .from("promise_notification_state")
        .upsert({
          promise_id: row.id,
          due_soon_notified_at: nowIso,
          updated_at: nowIso,
        });
      results.dueSoon += 1;
    }
  }

  const { data: overdueRows } = await admin
    .from("promises")
    .select(
      "id,due_at,creator_id,counterparty_id,counterparty_accepted_at,promisor_id,promisee_id,promise_notification_state(overdue_notified_at,overdue_creator_notified_at)"
    )
    .eq("status", "active")
    .lt("due_at", nowIso);

  for (const row of overdueRows ?? []) {
    if (!row.due_at || !isAccepted(row)) continue;
    const executorId = resolveExecutorId(row);
    if (!executorId) continue;
    const state = getNotificationState(row.promise_notification_state);

    const lastOverdue = state.overdue_notified_at ? new Date(state.overdue_notified_at) : null;
    const canNotifyExecutor =
      !lastOverdue || now.getTime() - lastOverdue.getTime() >= HOURS_72;

    if (canNotifyExecutor) {
      const created = await createNotification(admin, {
        userId: executorId,
        promiseId: row.id,
        type: "N4",
        role: "executor",
        dedupeKey: buildDedupeKey(["N4", row.id, "executor", lastOverdue ? "repeat" : "first"]),
        ctaUrl: buildCtaUrl(row.id),
        priority: mapPriorityForType("N4"),
      });

      if (created.created) {
        await admin
          .from("promise_notification_state")
          .upsert({
            promise_id: row.id,
            overdue_notified_at: nowIso,
            updated_at: nowIso,
          });
        results.overdue += 1;
      }
    }

    if (!state.overdue_creator_notified_at) {
      const created = await createNotification(admin, {
        userId: row.creator_id,
        promiseId: row.id,
        type: "N4",
        role: "creator",
        dedupeKey: buildDedupeKey(["N4", row.id, "creator"]),
        ctaUrl: buildCtaUrl(row.id),
        priority: mapPriorityForType("N4"),
      });

      if (created.created) {
        await admin
          .from("promise_notification_state")
          .upsert({
            promise_id: row.id,
            overdue_creator_notified_at: nowIso,
            updated_at: nowIso,
          });
        results.overdue += 1;
      }
    }
  }

  const { data: completionRows } = await admin
    .from("promises")
    .select(
      "id,completed_at,creator_id,counterparty_id,counterparty_accepted_at,promisor_id,promisee_id,promise_notification_state(completion_notified_at,completion_followups_count,completion_cycle_id,completion_cycle_started_at)"
    )
    .eq("status", "completed_by_promisor");

  for (const row of completionRows ?? []) {
    const state = getNotificationState(row.promise_notification_state);
    if (!state.completion_notified_at) continue;
    if (row.completed_at && state.completion_cycle_started_at) {
      if (row.completed_at !== state.completion_cycle_started_at) continue;
    }

    const stage = getCompletionFollowupStage(
      state.completion_notified_at ? new Date(state.completion_notified_at) : null,
      state.completion_followups_count ?? 0,
      now
    );

    if (!stage) continue;

    const followup = stage === "24h" ? "completion24" : "completion72";
    const created = await createNotification(admin, {
      userId: row.creator_id,
      promiseId: row.id,
      type: "N5",
      role: "creator",
      followup,
      dedupeKey: buildDedupeKey(["N5", row.id, state.completion_cycle_id ?? 0, followup]),
      ctaUrl: `/promises/${row.id}/confirm`,
      priority: mapPriorityForType("N5"),
    });

    if (created.created) {
      await admin
        .from("promise_notification_state")
        .upsert({
          promise_id: row.id,
          completion_followups_count: (state.completion_followups_count ?? 0) + 1,
          completion_followup_last_at: nowIso,
          updated_at: nowIso,
        });
      results.completionFollowups += 1;
    }
  }

  return NextResponse.json({ ok: true, results }, { status: 200 });
}

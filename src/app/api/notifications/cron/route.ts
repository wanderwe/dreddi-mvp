import { NextResponse } from "next/server";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import {
  buildCtaUrl,
  buildDedupeKey,
  createNotification,
  getUserNotificationSettings,
  mapPriorityForType,
} from "@/lib/notifications/service";
import { getCompletionFollowupStage } from "@/lib/notifications/policy";
import { isPromiseAccepted } from "@/lib/promiseAcceptance";
import { getInviteResponseCopy, resolveInviteActorName } from "@/lib/notifications/inviteResponses";

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
  const ignoreAfterHours = Number(process.env.IGNORE_AFTER_HOURS ?? "72");
  const ignoreAfter =
    (Number.isFinite(ignoreAfterHours) ? ignoreAfterHours : 72) * 60 * 60 * 1000;
  const ignoreCutoff = new Date(now.getTime() - ignoreAfter);

  const results = {
    inviteFollowups: 0,
    dueSoon: 0,
    overdue: 0,
    completionFollowups: 0,
    ignored: 0,
  };

  const { data: staleInvites } = await admin
    .from("promises")
    .select(
      "id,title,creator_id,counterparty_id,invited_at,created_at,invite_status,counterparty_accepted_at"
    )
    .eq("status", "active")
    .is("counterparty_accepted_at", null)
    .not("counterparty_id", "is", null)
    .or("invite_status.is.null,invite_status.eq.awaiting_acceptance");

  const counterpartyIds = Array.from(
    new Set((staleInvites ?? []).map((row) => row.counterparty_id).filter(Boolean))
  ) as string[];

  const { data: counterpartyProfiles } = counterpartyIds.length
    ? await admin
        .from("profiles")
        .select("id,handle,display_name")
        .in("id", counterpartyIds)
    : { data: [] as Array<{ id: string; handle: string | null; display_name: string | null }> };

  const counterpartyLookup = new Map(
    (counterpartyProfiles ?? []).map((profile) => [profile.id, profile])
  );

  for (const row of staleInvites ?? []) {
    if (row.invite_status && row.invite_status !== "awaiting_acceptance") continue;
    const invitedAt = row.invited_at ?? row.created_at;
    if (!invitedAt || new Date(invitedAt).getTime() > ignoreCutoff.getTime()) continue;

    const { error } = await admin
      .from("promises")
      .update({
        invite_status: "ignored",
        ignored_at: nowIso,
      })
      .eq("id", row.id)
      .is("counterparty_accepted_at", null)
      .or("invite_status.is.null,invite_status.eq.awaiting_acceptance");

    if (!error) {
      results.ignored += 1;

      const settings = await getUserNotificationSettings(admin, row.creator_id);
      const copy = getInviteResponseCopy({
        locale: settings.locale,
        response: "ignored",
        actorName: resolveInviteActorName(counterpartyLookup.get(row.counterparty_id ?? "")),
        dealTitle: row.title ?? null,
      });

      await createNotification(admin, {
        userId: row.creator_id,
        promiseId: row.id,
        type: "invite_ignored",
        role: "creator",
        dedupeKey: buildDedupeKey(["invite_ignored", row.id]),
        ctaUrl: buildCtaUrl(row.id),
        ctaLabel: copy.ctaLabel,
        priority: mapPriorityForType("invite_ignored"),
        title: copy.title,
        body: copy.body,
      });
    }
  }

  const { data: invites } = await admin
    .from("promises")
    .select(
      "id,invite_token,counterparty_id,counterparty_accepted_at,invite_status,creator_id,promisor_id,promisee_id,promise_notification_state(invite_notified_at,invite_followup_notified_at)"
    )
    .eq("status", "active")
    .is("counterparty_accepted_at", null)
    .not("counterparty_id", "is", null)
    .not("invite_token", "is", null);

  for (const row of invites ?? []) {
    const state = getNotificationState(row.promise_notification_state);
    if (!row.counterparty_id) continue;
    if (row.invite_status && row.invite_status !== "awaiting_acceptance") continue;
    if (!state.invite_notified_at || state.invite_followup_notified_at) continue;

    const notifiedAt = new Date(state.invite_notified_at);
    if (now.getTime() - notifiedAt.getTime() < HOURS_24) continue;

    const created = await createNotification(admin, {
      userId: row.counterparty_id,
      promiseId: row.id,
      type: "invite",
      role: "executor",
      followup: "invite",
      dedupeKey: buildDedupeKey(["invite", row.id, "followup"]),
      ctaUrl: row.invite_token ? `/p/invite/${row.invite_token}` : buildCtaUrl(row.id),
      priority: mapPriorityForType("invite"),
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
    if (!row.due_at || !isPromiseAccepted(row)) continue;
    const state = getNotificationState(row.promise_notification_state);
    if (state.due_soon_notified_at) continue;
    const executorId = resolveExecutorId(row);
    if (!executorId) continue;

    const created = await createNotification(admin, {
      userId: executorId,
      promiseId: row.id,
      type: "due_soon",
      role: "executor",
      dedupeKey: buildDedupeKey(["due_soon", row.id]),
      ctaUrl: buildCtaUrl(row.id),
      priority: mapPriorityForType("due_soon"),
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
    if (!row.due_at || !isPromiseAccepted(row)) continue;
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
        type: "overdue",
        role: "executor",
        dedupeKey: buildDedupeKey(["overdue", row.id, "executor", lastOverdue ? "repeat" : "first"]),
        ctaUrl: buildCtaUrl(row.id),
        priority: mapPriorityForType("overdue"),
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
        type: "overdue",
        role: "creator",
        dedupeKey: buildDedupeKey(["overdue", row.id, "creator"]),
        ctaUrl: buildCtaUrl(row.id),
        priority: mapPriorityForType("overdue"),
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
      type: "completion_waiting",
      role: "creator",
      followup,
      dedupeKey: buildDedupeKey([
        "completion_waiting",
        row.id,
        state.completion_cycle_id ?? 0,
        followup,
      ]),
      ctaUrl: `/promises/${row.id}/confirm`,
      priority: mapPriorityForType("completion_waiting"),
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

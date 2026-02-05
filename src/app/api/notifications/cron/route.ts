import { NextResponse } from "next/server";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";

const HOURS_24 = 24 * 60 * 60 * 1000;

type PromiseNotificationState = {
  due_soon_notified_at?: string | null;
  overdue_notified_at?: string | null;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null | undefined => {
  if (typeof value === "string") return value;
  if (value === null) return null;
  return undefined;
};

const getNotificationState = (raw: unknown): PromiseNotificationState => {
  if (!isPlainRecord(raw)) return {};

  return {
    due_soon_notified_at: readString(raw.due_soon_notified_at),
    overdue_notified_at: readString(raw.overdue_notified_at),
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

  const results = {
    dueSoon: 0,
    overdue: 0,
  };

  const processed = {
    dueSoon: 0,
    overdue: 0,
  };

  const skipReasonCounts: Record<string, number> = {};
  const trackSkip = (reason?: string) => {
    if (!reason) return;
    skipReasonCounts[reason] = (skipReasonCounts[reason] ?? 0) + 1;
  };
  // --- 1) due soon (within 24h) ---
  const { data: dueSoonRows } = await admin
    .from("promises")
    .select(
      "id,due_at,creator_id,counterparty_id,counterparty_accepted_at,accepted_at,invite_status,promisor_id,promisee_id,promise_notification_state(due_soon_notified_at)"
    )
    .eq("status", "active")
    .gte("due_at", nowIso)
    .lte("due_at", dueSoonCutoff);

  for (const row of dueSoonRows ?? []) {
    if (!row.due_at) continue;

    const state = getNotificationState(row.promise_notification_state);
    if (state.due_soon_notified_at) continue;

    processed.dueSoon += 1;
    const [result] = await dispatchNotificationEvent({
      admin,
      event: "reminder_due_24h",
      promise: row,
      requiresDeadlineReminder: true,
    });
    trackSkip(result?.outcome.skippedReason);

    if (result?.outcome.created) {
      await admin.from("promise_notification_state").upsert({
        promise_id: row.id,
        due_soon_notified_at: nowIso,
        updated_at: nowIso,
      });
      results.dueSoon += 1;
    }
  }

  // --- 2) overdue (executor once) ---
  const { data: overdueRows } = await admin
    .from("promises")
    .select(
      "id,due_at,creator_id,counterparty_id,counterparty_accepted_at,accepted_at,invite_status,promisor_id,promisee_id,promise_notification_state(overdue_notified_at)"
    )
    .eq("status", "active")
    .lt("due_at", nowIso);

  for (const row of overdueRows ?? []) {
    if (!row.due_at) continue;

    const state = getNotificationState(row.promise_notification_state);

    if (state.overdue_notified_at) continue;

    processed.overdue += 1;
    const [result] = await dispatchNotificationEvent({
      admin,
      event: "reminder_overdue",
      promise: row,
      requiresDeadlineReminder: true,
    });
    trackSkip(result?.outcome.skippedReason);

    if (result?.outcome.created) {
      await admin.from("promise_notification_state").upsert({
        promise_id: row.id,
        overdue_notified_at: nowIso,
        updated_at: nowIso,
      });
      results.overdue += 1;
    }
  }

  console.info("[notifications] cron_summary", {
    processed,
    created: results,
    skipped: skipReasonCounts,
  });

  return NextResponse.json(
    { ok: true, results, processed, skipped: skipReasonCounts },
    { status: 200 }
  );
}

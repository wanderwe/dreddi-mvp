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

const authorizeCron = (req: Request): NextResponse | null => {
  const secret = process.env.CRON_SECRET ?? process.env.NOTIFICATIONS_CRON_SECRET;
  if (!secret) return null;

  // Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`.
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
};

const runCron = async (req: Request) => {
  const unauthorized = authorizeCron(req);
  if (unauthorized) return unauthorized;

  console.info("[notifications] cron_start", {
    timestamp: new Date().toISOString(),
  });

  const admin = getAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const dueSoonCutoff = new Date(now.getTime() + HOURS_24).toISOString();
  const overdueCutoff = new Date(now.getTime() - HOURS_24).toISOString();

  const results = {
    dueSoon: 0,
    overdue: 0,
  };

  const processed = {
    dueSoon: 0,
    overdue: 0,
  };

  let errors = 0;

  const skipReasonCounts: Record<string, number> = {};
  const trackSkip = (reason?: string) => {
    if (!reason) return;
    skipReasonCounts[reason] = (skipReasonCounts[reason] ?? 0) + 1;
  };

  const { data: dueSoonRows, error: dueSoonFetchError } = await admin
    .from("promises")
    .select(
      "id,due_at,creator_id,counterparty_id,counterparty_accepted_at,accepted_at,invite_status,promisor_id,promisee_id,promise_notification_state(due_soon_notified_at)"
    )
    .eq("status", "active")
    .gte("due_at", nowIso)
    .lte("due_at", dueSoonCutoff);

  if (dueSoonFetchError) {
    errors += 1;
    console.error("[notifications] cron_due_soon_fetch_failed", {
      error: dueSoonFetchError,
    });
  }

  console.info("[notifications] cron_due_soon_found", {
    count: dueSoonRows?.length ?? 0,
  });

  for (const row of dueSoonRows ?? []) {
    if (!row.due_at) continue;

    const state = getNotificationState(row.promise_notification_state);
    if (state.due_soon_notified_at) continue;

    processed.dueSoon += 1;

    try {
      const [result] = await dispatchNotificationEvent({
        admin,
        event: "reminder_due_24h",
        promise: row,
        requiresDeadlineReminder: true,
      });
      trackSkip(result?.outcome.skippedReason);

      if (result?.outcome.created) {
        const { error: upsertError } = await admin
          .from("promise_notification_state")
          .upsert({
            promise_id: row.id,
            due_soon_notified_at: nowIso,
            updated_at: nowIso,
          });

        if (upsertError) {
          errors += 1;
          console.error("[notifications] cron_due_soon_state_upsert_failed", {
            promiseId: row.id,
            error: upsertError,
          });
          continue;
        }

        results.dueSoon += 1;
      }
    } catch (error) {
      errors += 1;
      console.error("[notifications] cron_due_soon_dispatch_failed", {
        promiseId: row.id,
        error,
      });
    }
  }

  const { data: overdueRows, error: overdueFetchError } = await admin
    .from("promises")
    .select(
      "id,due_at,creator_id,counterparty_id,counterparty_accepted_at,accepted_at,invite_status,promisor_id,promisee_id,promise_notification_state(overdue_notified_at)"
    )
    .eq("status", "active")
    .lte("due_at", overdueCutoff);

  if (overdueFetchError) {
    errors += 1;
    console.error("[notifications] cron_overdue_fetch_failed", {
      error: overdueFetchError,
    });
  }

  console.info("[notifications] cron_overdue_found", {
    count: overdueRows?.length ?? 0,
  });

  for (const row of overdueRows ?? []) {
    if (!row.due_at) continue;

    const state = getNotificationState(row.promise_notification_state);

    if (state.overdue_notified_at) continue;

    processed.overdue += 1;

    try {
      const [result] = await dispatchNotificationEvent({
        admin,
        event: "reminder_overdue",
        promise: row,
        requiresDeadlineReminder: true,
      });
      trackSkip(result?.outcome.skippedReason);

      if (result?.outcome.created) {
        const { error: upsertError } = await admin
          .from("promise_notification_state")
          .upsert({
            promise_id: row.id,
            overdue_notified_at: nowIso,
            updated_at: nowIso,
          });

        if (upsertError) {
          errors += 1;
          console.error("[notifications] cron_overdue_state_upsert_failed", {
            promiseId: row.id,
            error: upsertError,
          });
          continue;
        }

        results.overdue += 1;
      }
    } catch (error) {
      errors += 1;
      console.error("[notifications] cron_overdue_dispatch_failed", {
        promiseId: row.id,
        error,
      });
    }
  }

  const remindersFound = (dueSoonRows?.length ?? 0) + (overdueRows?.length ?? 0);
  const processedTotal = processed.dueSoon + processed.overdue;
  const emailsSent = results.dueSoon + results.overdue;

  console.info("[notifications] cron_emails_sent", { emailsSent });
  console.info("[notifications] cron_summary", {
    remindersFound,
    processed,
    created: results,
    skipped: skipReasonCounts,
    errors,
  });

  return NextResponse.json(
    {
      processed: processedTotal,
      emailsSent,
      errors,
    },
    { status: 200 }
  );
};

export async function GET(req: Request) {
  return runCron(req);
}

export async function POST(req: Request) {
  return runCron(req);
}

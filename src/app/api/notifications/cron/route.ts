import { NextResponse } from "next/server";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { isPromiseAccepted } from "@/lib/promiseAcceptance";

const HOURS_24 = 24 * 60 * 60 * 1000;

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const missingRequiredEnvVars = () =>
  REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

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

type CronResponse = {
  processed: number;
  emailsSent: number;
  errors: string[];
};

const getCronSecret = () =>
  process.env.CRON_SECRET ?? process.env.NOTIFICATIONS_CRON_SECRET;

const unauthorizedResponse = () =>
  NextResponse.json<CronResponse>(
    { processed: 0, emailsSent: 0, errors: ["Unauthorized"] },
    { status: 401 }
  );

const authorizeCron = (req: Request): NextResponse<CronResponse> | null => {
  const secret = getCronSecret();
  const authHeader = req.headers.get("authorization");

  if (!secret || !authHeader || authHeader !== `Bearer ${secret}`) {
    return unauthorizedResponse();
  }

  return null;
};

const runCron = async (req: Request) => {
  const unauthorized = authorizeCron(req);
  if (unauthorized) return unauthorized;

  const startedAt = new Date().toISOString();
  const response: CronResponse = {
    processed: 0,
    emailsSent: 0,
    errors: [],
  };

  const missingEnvVars = missingRequiredEnvVars();
  if (missingEnvVars.length > 0) {
    const message = `Missing required environment variables: ${missingEnvVars.join(", ")}`;
    response.errors.push(message);
    console.error("[notifications] cron_env_missing", { missingEnvVars });

    return NextResponse.json(response, { status: 500 });
  }

  console.info("[notifications] cron_start", {
    route: "cron",
    ts: startedAt,
    envPresent: {
      resendKey: Boolean(process.env.RESEND_API_KEY),
      from: Boolean(process.env.RESEND_FROM_EMAIL),
      appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    },
  });

  try {
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
      response.errors.push(`Due soon fetch failed: ${dueSoonFetchError.message}`);
      console.error("[notifications] cron_due_soon_fetch_failed", {
        error: dueSoonFetchError,
      });
    }

    console.info("[notifications] cron_due_soon_found", {
      count: dueSoonRows?.length ?? 0,
    });

    for (const row of dueSoonRows ?? []) {
    if (!row.due_at) continue;
    if (!isPromiseAccepted(row)) continue;

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
          response.errors.push(`Due soon state upsert failed for ${row.id}`);
          console.error("[notifications] cron_due_soon_state_upsert_failed", {
            promiseId: row.id,
            error: upsertError,
          });
          continue;
        }

        results.dueSoon += 1;
      }
    } catch (error) {
      response.errors.push(`Due soon dispatch failed for ${row.id}`);
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
      response.errors.push(`Overdue fetch failed: ${overdueFetchError.message}`);
      console.error("[notifications] cron_overdue_fetch_failed", {
        error: overdueFetchError,
      });
    }

    console.info("[notifications] cron_overdue_found", {
      count: overdueRows?.length ?? 0,
    });

    for (const row of overdueRows ?? []) {
    if (!row.due_at) continue;
    if (!isPromiseAccepted(row)) continue;

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
          response.errors.push(`Overdue state upsert failed for ${row.id}`);
          console.error("[notifications] cron_overdue_state_upsert_failed", {
            promiseId: row.id,
            error: upsertError,
          });
          continue;
        }

        results.overdue += 1;
      }
    } catch (error) {
      response.errors.push(`Overdue dispatch failed for ${row.id}`);
      console.error("[notifications] cron_overdue_dispatch_failed", {
        promiseId: row.id,
        error,
      });
    }
  }

    const remindersFound = (dueSoonRows?.length ?? 0) + (overdueRows?.length ?? 0);
    response.processed = processed.dueSoon + processed.overdue;
    response.emailsSent = results.dueSoon + results.overdue;

    console.info("[notifications] cron_emails_sent", {
      emailsSent: response.emailsSent,
    });
    console.info("[notifications] cron_summary", {
      remindersFound,
      processed,
      created: results,
      skipped: skipReasonCounts,
      errors: response.errors,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    response.errors.push(errorMessage);

    console.error("[notifications] cron_failed", {
      message: errorMessage,
      stack: errorStack,
      error,
    });

    return NextResponse.json(response, { status: 500 });
  } finally {
    console.info("[notifications] cron_finish", {
      processed: response.processed,
      emailsSent: response.emailsSent,
      errorsCount: response.errors.length,
    });
  }
};

export async function GET(req: Request) {
  return runCron(req);
}

export async function POST(req: Request) {
  return runCron(req);
}

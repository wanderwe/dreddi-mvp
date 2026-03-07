import { NextResponse } from "next/server";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { isPromiseAccepted } from "@/lib/promiseAcceptance";

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

type CronIssue = { code: string; message?: string };
type CronSuccessResponse = {
  processed: number;
  emailsSent: number;
  skipped: number;
  errors: CronIssue[];
};

type CronErrorResponse = {
  ok: false;
  error: string;
};

type OverduePromiseRow = {
  id: string;
  due_at: string | null;
  creator_id: string;
  counterparty_id: string | null;
  counterparty_accepted_at: string | null;
  accepted_at: string | null;
  invite_status: string | null;
  promisor_id: string | null;
  promisee_id: string | null;
};

const unauthorizedResponse = () =>
  NextResponse.json<CronErrorResponse>({ ok: false, error: "unauthorized" }, { status: 401 });

const missingCronSecretResponse = () =>
  NextResponse.json<CronErrorResponse>({ ok: false, error: "cron_secret_missing" }, { status: 500 });

const getCronSecret = () => process.env.CRON_SECRET ?? process.env.NOTIFICATIONS_CRON_SECRET;

const missingRequiredEnvVars = () => REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

const getTokenFromAuthHeader = (req: Request) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
};

const authorizeCron = (
  req: Request
): NextResponse<CronErrorResponse> | null => {
  const secret = getCronSecret();

  if (!secret) {
    console.error("[notifications] cron_secret_missing", {
      ts: new Date().toISOString(),
      route: "cron",
    });
    return missingCronSecretResponse();
  }

  const bearerToken = getTokenFromAuthHeader(req);
  if (bearerToken === secret) {
    return null;
  }

  return unauthorizedResponse();
};

export const isEligibleDeadlineReminder = (dueAt: string | null, now: Date) => {
  if (!dueAt) return false;
  return new Date(dueAt).getTime() <= now.getTime();
};

const runCron = async (req: Request) => {
  const unauthorized = authorizeCron(req);
  if (unauthorized) return unauthorized;

  const response: CronSuccessResponse = {
    processed: 0,
    emailsSent: 0,
    skipped: 0,
    errors: [],
  };

  const missingEnvVars = missingRequiredEnvVars();
  if (missingEnvVars.length > 0) {
    response.errors.push("env_missing");
    console.error("[notifications] cron_env_missing", { missingEnvVars });

    response.errors = [...new Set(response.errors)].sort();
    return NextResponse.json(response, { status: 500 });
  }

  const now = new Date();
  console.info("[notifications] cron_start", { ts: now.toISOString() });

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
      response.errors.push("due_soon_fetch_failed");
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
            response.errors.push("due_soon_state_upsert_failed");
            console.error("[notifications] cron_due_soon_state_upsert_failed", {
              promiseId: row.id,
              error: upsertError,
            });
            continue;
          }

          results.dueSoon += 1;
        }
      } catch (error) {
        response.errors.push("due_soon_dispatch_failed");
        console.error("[notifications] cron_due_soon_dispatch_failed", {
          promiseId: row.id,
          error,
        });
      }
    }

    const { data: overdueRows, error: overdueFetchError } = await admin
      .from("promises")
      .select(
        "id,due_at,creator_id,counterparty_id,counterparty_accepted_at,accepted_at,invite_status,promisor_id,promisee_id"
      )
      .eq("status", "active")
      .not("due_at", "is", null)
      .lte("due_at", now.toISOString());

    if (overdueFetchError) {
      response.errors.push("overdue_fetch_failed");
      console.error("[notifications] cron_overdue_fetch_failed", {
        error: overdueFetchError,
      });
    }

    const candidates = (overdueRows ?? []) as OverduePromiseRow[];
    console.info("[notifications] cron_candidates", { candidates: candidates.length });

    for (const row of candidates) {
      if (!isPromiseAccepted(row) || !isEligibleDeadlineReminder(row.due_at, now)) {
        response.skipped += 1;
        continue;
      }

      response.processed += 1;
      try {
        const [result] = await dispatchNotificationEvent({
          admin,
          event: "deadline_passed",
          promise: row,
          requiresDeadlineReminder: true,
        });

        if (result?.outcome.created) {
          const { error: upsertError } = await admin
            .from("promise_notification_state")
            .upsert({
              promise_id: row.id,
              overdue_notified_at: nowIso,
              updated_at: nowIso,
            });

          if (upsertError) {
            response.errors.push("overdue_state_upsert_failed");
            console.error("[notifications] cron_overdue_state_upsert_failed", {
              promiseId: row.id,
              error: upsertError,
            });
            continue;
          }

          results.overdue += 1;
        }
      } catch (error) {
        response.errors.push("overdue_dispatch_failed");
        console.error("[notifications] cron_overdue_dispatch_failed", {
          promiseId: row.id,
          error,
        });
      }
    }

    console.info("[notifications] cron_finish", {
      candidates: candidates.length,
      processed: response.processed,
      sent: response.emailsSent,
      skipped: response.skipped,
      errors: response.errors.length,
    });

    response.errors = [...new Set(response.errors)].sort();
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    response.errors.push("cron_failed");

    console.error("[notifications] cron_failed", {
      message: errorMessage,
      stack: errorStack,
      error,
    });

    response.errors = [...new Set(response.errors)].sort();
    return NextResponse.json(response, { status: 500 });
  }
};

export async function GET(req: Request) {
  return runCron(req);
}

export async function POST(req: Request) {
  return runCron(req);
}

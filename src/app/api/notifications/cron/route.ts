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
  ok: true;
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

export const authorizeCron = (req: Request): NextResponse<CronErrorResponse> | null => {
  const secret = getCronSecret();
  if (!secret) return missingCronSecretResponse();
  const bearerToken = getTokenFromAuthHeader(req);
  if (bearerToken === secret) return null;
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
    ok: true,
    processed: 0,
    emailsSent: 0,
    skipped: 0,
    errors: [],
  };

  const missingEnvVars = missingRequiredEnvVars();
  if (missingEnvVars.length > 0) {
    response.errors.push({ code: "env_missing", message: missingEnvVars.join(",") });
    return NextResponse.json(response, { status: 500 });
  }

  const now = new Date();
  console.info("[notifications] cron_start", { ts: now.toISOString() });

  try {
    const admin = getAdminClient();
    const { data: overdueRows, error: overdueFetchError } = await admin
      .from("promises")
      .select(
        "id,due_at,creator_id,counterparty_id,counterparty_accepted_at,accepted_at,invite_status,promisor_id,promisee_id"
      )
      .eq("status", "active")
      .not("due_at", "is", null)
      .lte("due_at", now.toISOString());

    if (overdueFetchError) {
      response.errors.push({ code: "overdue_fetch_failed", message: overdueFetchError.message });
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
          response.emailsSent += 1;
        } else {
          response.skipped += 1;
        }
      } catch (error) {
        response.errors.push({
          code: "deadline_dispatch_failed",
          message: error instanceof Error ? error.message : String(error),
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

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    response.errors.push({
      code: "cron_failed",
      message: error instanceof Error ? error.message : String(error),
    });
    console.error("[notifications] cron_failed", { error });
    return NextResponse.json(response, { status: 500 });
  }
};

export async function GET(req: Request) {
  return runCron(req);
}

export async function POST(req: Request) {
  return runCron(req);
}

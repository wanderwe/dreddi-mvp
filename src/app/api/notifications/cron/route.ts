import { NextResponse } from "next/server";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { createNotification, mapPriorityForType } from "@/lib/notifications/service";
import { isPromiseAccepted } from "@/lib/promiseAcceptance";

const REQUIRED_ENV_VARS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const HOURS_24 = 24 * 60 * 60 * 1000;
const INVITE_IGNORE_TIMEOUT_HOURS = 72;

type CronSuccessResponse = {
  processed: number;
  emailsSent: number;
  skipped: number;
  errors: string[];
};

type CronErrorResponse = {
  ok: false;
  error: string;
};

type PromiseRow = {
  id: string;
  status?: string;
  created_at?: string | null;
  invited_at?: string | null;
  expires_at?: string | null;
  ignored_at?: string | null;
  due_at: string | null;
  title?: string | null;
  creator_id: string;
  counterparty_id: string | null;
  counterparty_accepted_at: string | null;
  accepted_at: string | null;
  invite_status: string | null;
  promisor_id: string | null;
  promisee_id: string | null;
  promise_notification_state?: Array<{ due_soon_notified_at?: string | null }> | null;
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

const getNotificationState = (state: PromiseRow["promise_notification_state"]) => state?.[0] ?? {};

const parseInviteIgnoreMinutesOverride = (url: URL) => {
  const rawValue = url.searchParams.get("inviteIgnoreMinutes");
  if (!rawValue) return null;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const runCron = async (req: Request) => {
  const unauthorized = authorizeCron(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const inviteIgnoreMinutesOverride = parseInviteIgnoreMinutesOverride(url);
  const inviteIgnoreTimeoutMs =
    inviteIgnoreMinutesOverride !== null
      ? inviteIgnoreMinutesOverride * 60 * 1000
      : INVITE_IGNORE_TIMEOUT_HOURS * 60 * 60 * 1000;

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

  const startedAt = new Date();
  console.info("[notifications] reminder_cron_run_started", {
    ts: startedAt.toISOString(),
    dryRun,
  });

  try {
    const admin = getAdminClient();
    const now = new Date();
    const nowIso = now.toISOString();
    const dueSoonCutoff = new Date(now.getTime() + HOURS_24).toISOString();
    const inviteIgnoreCutoffIso = new Date(now.getTime() - inviteIgnoreTimeoutMs).toISOString();
    const triggeredTypes = new Set<string>();

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
      console.error("[notifications] cron_due_soon_fetch_failed", { error: dueSoonFetchError.message });
    }

    const { data: overdueRows, error: overdueFetchError } = await admin
      .from("promises")
      .select(
        "id,due_at,creator_id,counterparty_id,counterparty_accepted_at,accepted_at,invite_status,promisor_id,promisee_id"
      )
      .eq("status", "active")
      .not("due_at", "is", null)
      .lte("due_at", nowIso);

    if (overdueFetchError) {
      response.errors.push("overdue_fetch_failed");
      console.error("[notifications] cron_overdue_fetch_failed", { error: overdueFetchError.message });
    }

    const dueSoonCandidates = (dueSoonRows ?? []) as PromiseRow[];
    const overdueCandidates = (overdueRows ?? []) as PromiseRow[];
    const { data: inviteIgnoredRows, error: inviteIgnoredFetchError } = await admin
      .from("promises")
      .select(
        "id,title,status,creator_id,invite_status,created_at,invited_at,expires_at,ignored_at,counterparty_accepted_at,accepted_at"
      )
      .eq("status", "active")
      .eq("invite_status", "awaiting_acceptance")
      .is("counterparty_accepted_at", null)
      .is("accepted_at", null)
      .is("ignored_at", null)
      .lte("created_at", inviteIgnoreCutoffIso);

    if (inviteIgnoredFetchError) {
      response.errors.push("invite_ignored_fetch_failed");
      console.error("[notifications] cron_invite_ignored_fetch_failed", { error: inviteIgnoredFetchError.message });
    }

    const inviteIgnoredCandidates = (inviteIgnoredRows ?? []) as PromiseRow[];

    console.info("[notifications] reminder_cron_candidate_reminders_found", {
      ts: nowIso,
      dueSoon: dueSoonCandidates.length,
      overdue: overdueCandidates.length,
      total: dueSoonCandidates.length + overdueCandidates.length,
    });
    console.info("[notifications] reminder_cron_candidate_invite_ignored_found", {
      ts: nowIso,
      inviteIgnored: inviteIgnoredCandidates.length,
      inviteIgnoreCutoffIso,
      inviteIgnoreTimeoutMs,
      inviteIgnoreMinutesOverride,
    });

    const processCandidate = async (row: PromiseRow, reminderType: "reminder_due_24h" | "deadline_passed") => {
      const recipientIds = [row.creator_id, row.counterparty_id].filter(Boolean);
      const logBase = {
        promiseId: row.id,
        userId: recipientIds,
        reminderType,
        hasDueAt: Boolean(row.due_at),
      };

      const skip = (reason: string) => {
        response.skipped += 1;
        console.info("[notifications] reminder_cron_candidate", {
          ...logBase,
          eligibility: false,
          reason,
        });
      };

      if (reminderType === "deadline_passed" && !row.due_at) {
        skip("invalid_due_at_for_deadline");
        return;
      }

      if (reminderType === "reminder_due_24h") {
        const state = getNotificationState(row.promise_notification_state);
        if (state.due_soon_notified_at) {
          skip("dedupe_key_exists");
          return;
        }
      }

      if (!isPromiseAccepted(row)) {
        skip("dedupe_key_exists");
        return;
      }

      if (reminderType === "deadline_passed" && !isEligibleDeadlineReminder(row.due_at, now)) {
        skip("invalid_due_at_for_deadline");
        return;
      }

      response.processed += 1;
      console.info("[notifications] reminder_cron_candidate", {
        ...logBase,
        eligibility: true,
        reason: null,
      });

      if (dryRun) {
        skip("dedupe_key_exists");
        return;
      }

      try {
        const results = await dispatchNotificationEvent({
          admin,
          event: reminderType,
          promise: row,
          requiresDeadlineReminder: true,
        });

        let createdCount = 0;
        for (const result of results) {
          if (result.outcome.created) {
            triggeredTypes.add(reminderType);
            createdCount += 1;
            if (result.outcome.emailSent) {
              response.emailsSent += 1;
              console.info("[notifications] reminder_cron_candidate", {
                ...logBase,
                userId: result.userId,
                eligibility: true,
                reason: "sent",
              });
            } else if (result.outcome.emailSkippedReason) {
              response.skipped += 1;
              console.info("[notifications] reminder_cron_candidate", {
                ...logBase,
                userId: result.userId,
                eligibility: false,
                reason: result.outcome.emailSkippedReason,
              });
            }
          } else {
            response.skipped += 1;
            console.info("[notifications] reminder_cron_candidate", {
              ...logBase,
              userId: result.userId,
              eligibility: false,
              reason: result.outcome.skippedReason ?? "resend_failed",
            });
          }
        }

        if (createdCount === 0 && results.length === 0) {
          response.skipped += 1;
          console.info("[notifications] reminder_cron_candidate", {
            ...logBase,
            eligibility: false,
            reason: "missing_recipient_email",
          });
        }

        if (createdCount > 0 && reminderType === "reminder_due_24h") {
          const { error: upsertError } = await admin.from("promise_notification_state").upsert({
            promise_id: row.id,
            due_soon_notified_at: nowIso,
            updated_at: nowIso,
          });
          if (upsertError) {
            response.errors.push("due_soon_state_upsert_failed");
            console.error("[notifications] cron_due_soon_state_upsert_failed", { promiseId: row.id, error: upsertError.message });
          }
        }

        if (createdCount > 0 && reminderType === "deadline_passed") {
          const { error: upsertError } = await admin.from("promise_notification_state").upsert({
            promise_id: row.id,
            overdue_notified_at: nowIso,
            updated_at: nowIso,
          });
          if (upsertError) {
            response.errors.push("overdue_state_upsert_failed");
            console.error("[notifications] cron_overdue_state_upsert_failed", { promiseId: row.id, error: upsertError.message });
          }
        }
      } catch (error) {
        response.errors.push(reminderType === "reminder_due_24h" ? "due_soon_dispatch_failed" : "overdue_dispatch_failed");
        console.error("[notifications] reminder_cron_dispatch_failed", {
          promiseId: row.id,
          reminderType,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    const processInviteIgnoredCandidate = async (row: PromiseRow) => {
      const logBase = {
        ts: nowIso,
        promiseId: row.id,
        userId: row.creator_id,
        reminderType: "invite_ignored",
      };

      const skip = (reason: string) => {
        response.skipped += 1;
        console.info("[notifications] reminder_cron_candidate", {
          ...logBase,
          eligibility: false,
          reason,
        });
      };

      if (row.invite_status !== "awaiting_acceptance") {
        skip("invite_status_not_awaiting_acceptance");
        return;
      }
      if (row.accepted_at || row.counterparty_accepted_at) {
        skip("already_accepted");
        return;
      }
      if (row.ignored_at) {
        skip("already_ignored");
        return;
      }

      response.processed += 1;
      console.info("[notifications] reminder_cron_candidate", {
        ...logBase,
        eligibility: true,
        reason: null,
      });

      if (dryRun) {
        skip("dry_run");
        return;
      }

      const { error: statusUpdateError } = await admin
        .from("promises")
        .update({
          status: "declined",
          invite_status: "expired",
          ignored_at: nowIso,
        })
        .eq("id", row.id)
        .eq("status", "active")
        .eq("invite_status", "awaiting_acceptance");

      if (statusUpdateError) {
        response.errors.push("invite_ignored_status_update_failed");
        console.error("[notifications] cron_invite_ignored_status_update_failed", {
          promiseId: row.id,
          error: statusUpdateError.message,
        });
        return;
      }

      const { error: stateUpsertError } = await admin.from("promise_notification_state").upsert({
        promise_id: row.id,
        invite_ignored_at: nowIso,
        updated_at: nowIso,
      });

      if (stateUpsertError) {
        response.errors.push("invite_ignored_state_upsert_failed");
        console.error("[notifications] cron_invite_ignored_state_upsert_failed", {
          promiseId: row.id,
          error: stateUpsertError.message,
        });
      }

      const outcome = await createNotification(admin, {
        userId: row.creator_id,
        promiseId: row.id,
        type: "invite_ignored",
        role: "creator",
        title: "Invite expired",
        body: "No response was received before the invite expired.",
        dedupeKey: `invite_expired:${row.id}:${row.creator_id}`,
        ctaUrl: `/promises/${row.id}`,
        priority: mapPriorityForType("invite_ignored"),
      });

      if (outcome.created) {
        triggeredTypes.add("invite_ignored");
        if (outcome.emailSent) {
          response.emailsSent += 1;
        }
        console.info("[notifications] reminder_cron_candidate", {
          ...logBase,
          eligibility: true,
          reason: outcome.emailSent ? "sent" : "notification_created",
        });
      } else {
        response.skipped += 1;
        console.info("[notifications] reminder_cron_candidate", {
          ...logBase,
          eligibility: false,
          reason: outcome.skippedReason ?? "invite_ignored_notification_skipped",
        });
      }
    };

    for (const row of dueSoonCandidates) {
      await processCandidate(row, "reminder_due_24h");
    }
    for (const row of overdueCandidates) {
      await processCandidate(row, "deadline_passed");
    }
    for (const row of inviteIgnoredCandidates) {
      await processInviteIgnoredCandidate(row);
    }

    console.info("[notifications] reminder_cron_totals", {
      ts: new Date().toISOString(),
      processed: response.processed,
      emailsSent: response.emailsSent,
      skipped: response.skipped,
      triggeredTypes: [...triggeredTypes].sort(),
      errors: response.errors.length,
      dryRun,
    });

    response.errors = [...new Set(response.errors)].sort();
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    response.errors.push("cron_failed");
    console.error("[notifications] cron_failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
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

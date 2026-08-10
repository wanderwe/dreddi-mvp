import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";
import {
  DISPUTE_CODES,
  DisputeCode,
  getAdminClient,
  loadPromiseForUser,
} from "../common";
import { requireUser } from "@/lib/auth/requireUser";
import { applyReputationForPromiseFinalization } from "@/lib/reputation/applyReputation";
import { isPromiseAccepted } from "@/lib/promiseAcceptance";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { notifyAgreementWatchers } from "@/lib/notifications/watchers";
import { getNotificationDedupeKey } from "@/lib/notifications/recipients";
import type { PromiseRowMin } from "@/lib/promiseTypes";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const body = await req.json().catch(() => null);
    const code = body?.code as DisputeCode | undefined;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : undefined;

    if (!code || !DISPUTE_CODES.includes(code)) {
      return NextResponse.json({ error: "Invalid dispute code" }, { status: 400 });
    }

    const { id } = await ctx.params;
    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    const executorId = resolveExecutorId(promise);
    const counterpartyId = resolveCounterpartyId(promise);
    if (!executorId || !counterpartyId) {
      console.warn("[promises] missing participant id for dispute", {
        promiseId: id,
        executorId,
        counterpartyId,
        userId: user.id,
      });
    }
    // Creator-as-watchdog: when deal was activated without counterparty and
    // counterparty never joined, the creator can close it as not fulfilled.
    const isWatchdogClose =
      promise.activated_without_counterparty &&
      !promise.counterparty_id &&
      promise.creator_id === user.id;

    if (!isWatchdogClose) {
      if (!counterpartyId || counterpartyId !== user.id || executorId === user.id) {
        return NextResponse.json({ error: "Only the other side can dispute" }, { status: 403 });
      }
      if (!isPromiseAccepted(promise)) {
        return NextResponse.json({ error: "Deal is not accepted" }, { status: 400 });
      }
    }

    if (promise.condition_text && !promise.condition_met_at) {
      return NextResponse.json(
        {
          error: "You can’t confirm/dispute until the counter-condition is met.",
          error_code: "condition_not_met",
        },
        { status: 409 }
      );
    }

    const nowMs = Date.now();
    const dueAtMs = promise.due_at ? new Date(promise.due_at).getTime() : null;
    const isNotDeliveredFlow = code === "not_delivered";
    const reasonRequired = !isNotDeliveredFlow;

    if (reasonRequired && (!reason || reason.length < 4)) {
      return NextResponse.json(
        { error: "Please explain what was not fulfilled" },
        { status: 400 }
      );
    }

    if (!isWatchdogClose && !isNotDeliveredFlow && promise.status !== "completed_by_promisor") {
      return NextResponse.json({ error: "Deal is not awaiting confirmation" }, { status: 400 });
    }

    if (isNotDeliveredFlow) {
      if (promise.status !== "active") {
        return NextResponse.json({ error: "Deal is no longer active" }, { status: 409 });
      }
      if (!promise.due_at || !Number.isFinite(dueAtMs)) {
        return NextResponse.json({ error: "Deadline is required" }, { status: 400 });
      }
      if ((dueAtMs as number) >= nowMs) {
        return NextResponse.json({ error: "Deadline has not passed yet" }, { status: 409 });
      }
      if (promise.completed_at) {
        return NextResponse.json({ error: "Deal is already marked as completed" }, { status: 409 });
      }
    }

    const admin = getAdminClient();
    const disputedAt = new Date().toISOString();
    const { data: updatedPromise, error } = await admin
      .from("promises")
      .update({
        status: "disputed",
        disputed_at: disputedAt,
        disputed_by: user.id,
        disputed_code: code,
        dispute_reason: reason ?? null,
      })
      .eq("id", id)
      .select(
        "id,title,is_important,status,due_at,completed_at,creator_id,counterparty_id,promisor_id,promisee_id,confirmed_at,disputed_at,disputed_code,dispute_reason,invite_status,invited_at,accepted_at,counterparty_accepted_at,declined_at,ignored_at"
      )
      .eq("status", promise.status)
      .single<PromiseRowMin>();

    if (error || !updatedPromise) {
      const statusCode = error?.code === "PGRST116" ? 409 : 500;
      return NextResponse.json(
        { error: "Could not update promise", detail: error?.message },
        { status: statusCode }
      );
    }

    // Skip reputation when creator closes a deal that was never accepted by a real counterparty.
    if (!isWatchdogClose) {
      try {
        await applyReputationForPromiseFinalization(admin, updatedPromise);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to update reputation";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    const notificationResults = await dispatchNotificationEvent({
      admin,
      event: "disputed",
      promise: updatedPromise,
      actorId: user.id,
    });
    await notifyAgreementWatchers(admin, updatedPromise, "public_agreement_disputed", { actorId: user.id });

    if (process.env.NODE_ENV !== "production") {
      console.info("[notifications] dispute_dispatch_debug", {
        event: "disputed",
        promiseId: updatedPromise.id,
        actorId: user.id,
        dedupeKeys: notificationResults.map((result) =>
          getNotificationDedupeKey("disputed", updatedPromise.id, result.userId)
        ),
        results: notificationResults.map((result) => ({
          userId: result.userId,
          created: result.outcome.created,
          skippedReason: result.outcome.skippedReason ?? null,
        })),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

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
import { calc_score_impact } from "@/lib/reputation/calcScoreImpact";
import { isPromiseAccepted } from "@/lib/promiseAcceptance";
import { buildCompletionOutcomeNotification } from "@/lib/notifications/flows";
import { createNotification } from "@/lib/notifications/service";
import type { PromiseRowMin } from "@/lib/promiseTypes";
import { logMissingNotificationRecipient } from "@/lib/notifications/diagnostics";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const body = await req.json().catch(() => null);
    const code = body?.code as DisputeCode | undefined;
    const reason = typeof body?.reason === "string" ? body.reason : undefined;

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
    if (!counterpartyId || counterpartyId !== user.id || executorId === user.id) {
      return NextResponse.json({ error: "Only the other side can dispute" }, { status: 403 });
    }

    if (!isPromiseAccepted(promise)) {
      return NextResponse.json({ error: "Deal is not accepted" }, { status: 400 });
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

    if (promise.status !== "completed_by_promisor") {
      return NextResponse.json({ error: "Deal is not awaiting confirmation" }, { status: 400 });
    }

    const admin = getAdminClient();
    const disputedAt = new Date().toISOString();
    const { data: updatedPromise, error } = await admin
      .from("promises")
      .update({
        status: "disputed",
        disputed_at: disputedAt,
        disputed_code: code,
        dispute_reason: reason ?? null,
      })
      .eq("id", id)
      .select(
        "id,title,status,due_at,completed_at,creator_id,counterparty_id,promisor_id,promisee_id,confirmed_at,disputed_at,disputed_code,dispute_reason"
      )
      .single<PromiseRowMin>();

    if (error || !updatedPromise) {
      return NextResponse.json(
        { error: "Could not update promise", detail: error?.message },
        { status: 500 }
      );
    }

    try {
      await applyReputationForPromiseFinalization(admin, updatedPromise);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update reputation";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const finalExecutorId = resolveExecutorId(updatedPromise);
    const delta = calc_score_impact({
      status: updatedPromise.status,
      due_at: updatedPromise.due_at,
      completed_at: updatedPromise.completed_at,
    });

    if (!finalExecutorId) {
      logMissingNotificationRecipient({
        promiseId: updatedPromise.id,
        creatorId: updatedPromise.creator_id,
        promisorId: updatedPromise.promisor_id,
        promiseeId: updatedPromise.promisee_id,
        counterpartyId: updatedPromise.counterparty_id,
        flowName: "dispute_created",
        recipientRole: "executor",
      });
    } else {
      await createNotification(
        admin,
        buildCompletionOutcomeNotification({
          promiseId: updatedPromise.id,
          executorId: finalExecutorId,
          type: "dispute",
          delta,
        })
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

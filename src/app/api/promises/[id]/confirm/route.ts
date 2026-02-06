import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";
import { getAdminClient, loadPromiseForUser } from "../common";
import { requireUser } from "@/lib/auth/requireUser";
import { applyReputationForPromiseFinalization } from "@/lib/reputation/applyReputation";
import { isPromiseAccepted } from "@/lib/promiseAcceptance";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import type { PromiseRowMin } from "@/lib/promiseTypes";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    const executorId = resolveExecutorId(promise);
    const counterpartyId = resolveCounterpartyId(promise);
    if (!executorId || !counterpartyId) {
      console.warn("[promises] missing participant id for confirmation", {
        promiseId: id,
        executorId,
        counterpartyId,
        userId: user.id,
      });
    }
    if (!counterpartyId || counterpartyId !== user.id || executorId === user.id) {
      return NextResponse.json({ error: "Only the other side can confirm" }, { status: 403 });
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
    const confirmedAt = new Date().toISOString();
    const { data: updatedPromise, error } = await admin
      .from("promises")
      .update({
        status: "confirmed",
        confirmed_at: confirmedAt,
      })
      .eq("id", id)
      .select(
        "id,title,status,due_at,completed_at,creator_id,counterparty_id,promisor_id,promisee_id,confirmed_at,disputed_at,disputed_code,dispute_reason,invite_status,invited_at,accepted_at,counterparty_accepted_at,declined_at,ignored_at"
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

    await dispatchNotificationEvent({
      admin,
      event: "confirmed",
      promise: updatedPromise,
      actorId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

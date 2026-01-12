import { NextResponse } from "next/server";
import { resolveCounterpartyId } from "@/lib/promiseParticipants";
import { getAdminClient, loadPromiseForUser, requireUser } from "../common";
import { applyReputationForPromiseFinalization } from "@/lib/reputation/applyReputation";
import { calc_score_impact } from "@/lib/reputation/calcScoreImpact";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import {
  buildDedupeKey,
  createNotification,
  mapPriorityForType,
} from "@/lib/notifications/service";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    const counterpartyId = resolveCounterpartyId(promise);
    if (!counterpartyId || counterpartyId !== user.id) {
      return NextResponse.json({ error: "Only the counterparty can confirm" }, { status: 403 });
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
      .select("*")
      .single();

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

    const executorId = resolveExecutorId(updatedPromise);
    if (executorId) {
      const delta = calc_score_impact({
        status: updatedPromise.status,
        due_at: updatedPromise.due_at,
        completed_at: updatedPromise.completed_at,
      });
      await createNotification(admin, {
        userId: executorId,
        promiseId: updatedPromise.id,
        type: "N6",
        role: "executor",
        dedupeKey: buildDedupeKey(["N6", updatedPromise.id]),
        ctaUrl: `/promises/${updatedPromise.id}`,
        priority: mapPriorityForType("N6"),
        delta,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

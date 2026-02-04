import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";
import { isPromiseAccepted } from "@/lib/promiseAcceptance";
import { buildCompletionWaitingNotification } from "@/lib/notifications/flows";
import { createNotification } from "@/lib/notifications/service";
import { getAdminClient, loadPromiseForUser } from "../common";
import { requireUser } from "@/lib/auth/requireUser";

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
    if (!executorId || executorId !== user.id || counterpartyId === user.id) {
      return NextResponse.json({ error: "Only the executor can complete" }, { status: 403 });
    }

    if (!isPromiseAccepted(promise)) {
      return NextResponse.json({ error: "PROMISE_NOT_ACCEPTED" }, { status: 400 });
    }

    if (promise.status !== "active") {
      return NextResponse.json({ error: "Deal is not active" }, { status: 400 });
    }

    const admin = getAdminClient();
    const nowIso = new Date().toISOString();
    const { error } = await admin
      .from("promises")
      .update({
        status: "completed_by_promisor",
        completed_at: nowIso,
        confirmed_at: null,
        disputed_at: null,
        disputed_code: null,
        dispute_reason: null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Could not update promise", detail: error.message },
        { status: 500 }
      );
    }

    const { data: state } = await admin
      .from("promise_notification_state")
      .select("completion_cycle_id")
      .eq("promise_id", id)
      .maybeSingle();

    const nextCycle = (state?.completion_cycle_id ?? 0) + 1;

    await admin.from("promise_notification_state").upsert({
      promise_id: id,
      completion_cycle_id: nextCycle,
      completion_cycle_started_at: nowIso,
      completion_notified_at: nowIso,
      completion_followups_count: 0,
      completion_followup_last_at: null,
      updated_at: nowIso,
    });

    await createNotification(
      admin,
      buildCompletionWaitingNotification({
        promiseId: id,
        creatorId: promise.creator_id,
        cycleId: nextCycle,
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

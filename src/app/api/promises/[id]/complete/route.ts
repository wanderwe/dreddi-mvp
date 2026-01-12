import { NextResponse } from "next/server";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import { getAdminClient, loadPromiseForUser, requireUser } from "../common";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    const executorId = resolveExecutorId(promise);
    if (!executorId || executorId !== user.id) {
      return NextResponse.json({ error: "Only the executor can complete" }, { status: 403 });
    }

    const acceptedBySecondSide = Boolean(
      promise.counterparty_id ?? (promise.promisor_id && promise.promisee_id)
    );

    if (!acceptedBySecondSide) {
      return NextResponse.json({ error: "PROMISE_NOT_ACCEPTED" }, { status: 400 });
    }

    if (promise.status !== "active") {
      return NextResponse.json({ error: "Deal is not active" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { error } = await admin
      .from("promises")
      .update({
        status: "completed_by_promisor",
        completed_at: new Date().toISOString(),
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

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

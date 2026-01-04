import { NextResponse } from "next/server";
import { getAdminClient, loadPromiseForUser, requireUser } from "../common";
import { applyReputationForPromiseFinalization } from "@/lib/reputation/applyReputation";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    if (promise.counterparty_id !== user.id) {
      return NextResponse.json({ error: "Only the counterparty can confirm" }, { status: 403 });
    }

    if (promise.status !== "completed_by_promisor") {
      return NextResponse.json({ error: "Promise is not awaiting confirmation" }, { status: 400 });
    }

    const admin = getAdminClient();
    const confirmedAt = new Date().toISOString();
    const { error } = await admin
      .from("promises")
      .update({
        status: "confirmed",
        confirmed_at: confirmedAt,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Could not update promise", detail: error.message },
        { status: 500 }
      );
    }

    try {
      await applyReputationForPromiseFinalization(admin, {
        ...promise,
        status: "confirmed",
        confirmed_at: confirmedAt,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update reputation";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

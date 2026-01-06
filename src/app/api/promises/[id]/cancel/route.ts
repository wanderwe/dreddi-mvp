import { NextResponse } from "next/server";
import { getAdminClient, loadPromiseForUser, requireUser } from "../common";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    if (promise.creator_id !== user.id) {
      return NextResponse.json({ error: "Only the promisor can cancel" }, { status: 403 });
    }

    if (promise.counterparty_id) {
      return NextResponse.json({ error: "CANNOT_CANCEL_ACCEPTED" }, { status: 400 });
    }

    if (promise.status === "confirmed" || promise.status === "disputed") {
      return NextResponse.json({ error: "Promise is finalized" }, { status: 400 });
    }

    if (promise.status === "canceled") {
      return NextResponse.json({ ok: true, alreadyCanceled: true }, { status: 200 });
    }

    const admin = getAdminClient();
    const { error } = await admin
      .from("promises")
      .update({
        status: "canceled",
        invite_token: null,
        completed_at: null,
        confirmed_at: null,
        disputed_at: null,
        disputed_code: null,
        dispute_reason: null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Could not cancel promise", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

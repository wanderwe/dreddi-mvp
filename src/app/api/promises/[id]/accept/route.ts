import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { getAdminClient, loadPromiseForUser } from "../common";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const promise = await loadPromiseForUser(id, user.id);
    if (promise instanceof NextResponse) return promise;

    if (promise.creator_id === user.id) {
      return NextResponse.json({ error: "Creator cannot accept their own deal" }, { status: 400 });
    }

    if (promise.counterparty_id && promise.counterparty_id !== user.id) {
      return NextResponse.json({ error: "Only the selected counterparty can accept" }, { status: 403 });
    }

    if (promise.status !== "active") {
      return NextResponse.json({ error: "Deal is not pending acceptance" }, { status: 400 });
    }

    if (promise.invite_status === "accepted" || promise.accepted_at || promise.counterparty_accepted_at) {
      return NextResponse.json({ ok: true, status: "accepted" }, { status: 200 });
    }

    if (promise.invite_status !== "awaiting_acceptance") {
      return NextResponse.json({ error: "Deal is not pending acceptance" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const admin = getAdminClient();

    const { error: updateError } = await admin
      .from("promises")
      .update({
        invite_status: "accepted",
        accepted_at: nowIso,
        counterparty_accepted_at: nowIso,
        declined_at: null,
        ignored_at: null,
        cancelled_at: null,
      })
      .eq("id", id)
      .eq("invite_status", "awaiting_acceptance");

    if (updateError) {
      return NextResponse.json(
        { error: "Accept failed", detail: updateError.message },
        { status: 500 }
      );
    }

    await admin
      .from("deal_invites")
      .update({ status: "accepted" })
      .eq("deal_id", id)
      .eq("status", "created");

    await dispatchNotificationEvent({
      admin,
      event: "accepted",
      promise,
      actorId: user.id,
    });

    return NextResponse.json({ ok: true, status: "accepted" }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { getPromiseInviteStatus } from "@/lib/promiseAcceptance";
import { getAdminClient } from "../common";
import { requireUser } from "@/lib/auth/requireUser";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const admin = getAdminClient();
    const { data: promise, error } = await admin
      .from("promises")
      .select(
        "id,creator_id,counterparty_id,promisor_id,promisee_id,invite_status,accepted_at,counterparty_accepted_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Lookup failed", detail: error.message }, { status: 500 });
    }

    if (!promise) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (promise.promisee_id !== user.id) {
      return NextResponse.json({ error: "Only assigned promisee can accept" }, { status: 403 });
    }

    const inviteStatus = getPromiseInviteStatus(promise);
    if (inviteStatus !== "awaiting_acceptance") {
      return NextResponse.json({ error: "Deal is not awaiting acceptance" }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await admin
      .from("promises")
      .update({
        invite_status: "accepted",
        accepted_at: nowIso,
        counterparty_accepted_at: nowIso,
        counterparty_id: promise.counterparty_id ?? user.id,
      })
      .eq("id", id)
      .eq("invite_status", "awaiting_acceptance");

    if (updateError) {
      return NextResponse.json(
        { error: "Could not accept deal", detail: updateError.message },
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

    return NextResponse.json({ ok: true, status: "accepted" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

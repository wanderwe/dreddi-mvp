import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { getAdminClient } from "../common";
import { resolveCounterpartyId } from "@/lib/promiseParticipants";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { removeAgreementFollower } from "@/lib/agreements/followers";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const admin = getAdminClient();

    const { data: p, error: pErr } = await admin
      .from("promises")
      .select(
        "id, creator_id, counterparty_id, promisor_id, promisee_id, invite_status, condition_text, condition_proposed_by"
      )
      .eq("id", id)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json({ error: "Lookup failed", detail: pErr.message }, { status: 500 });
    }
    if (!p) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (p.creator_id !== user.id) {
      return NextResponse.json({ error: "Only the creator can confirm" }, { status: 403 });
    }
    if (p.invite_status !== "awaiting_creator_confirmation") {
      return NextResponse.json({ error: "Nothing to confirm" }, { status: 409 });
    }

    let body: { action?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      // no body
    }

    const action = body?.action;
    if (action !== "confirm" && action !== "cancel") {
      return NextResponse.json({ error: "action must be confirm or cancel" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    if (action === "cancel") {
      const { error } = await admin
        .from("promises")
        .update({ invite_status: "cancelled_by_creator", cancelled_at: nowIso })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: "Cancel failed", detail: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, cancelled: true });
    }

    // action === "confirm": activate the deal
    const resolvedCounterparty = resolveCounterpartyId({
      creator_id: p.creator_id,
      promisor_id: p.promisor_id ?? null,
      promisee_id: p.promisee_id ?? null,
      counterparty_id: p.counterparty_id ?? null,
    });

    const confirmUpdate: Record<string, unknown> = {
      invite_status: "accepted",
      counterparty_accepted_at: nowIso,
      accepted_at: nowIso,
    };

    if (p.condition_text) {
      confirmUpdate.condition_responsible_id = resolvedCounterparty;
    }

    const { error: upErr } = await admin.from("promises").update(confirmUpdate).eq("id", id);
    if (upErr) {
      return NextResponse.json({ error: "Confirm failed", detail: upErr.message }, { status: 500 });
    }

    if (p.counterparty_id) {
      const { error: followerErr } = await removeAgreementFollower(admin, id, p.counterparty_id);
      if (followerErr) {
        console.error("[confirm-condition] failed to remove follower", {
          agreementId: id,
          userId: p.counterparty_id,
          error: followerErr.message,
        });
      }
    }

    await admin
      .from("deal_invites")
      .update({ status: "accepted" })
      .eq("deal_id", id)
      .eq("status", "created");

    const { data: updatedPromise } = await admin
      .from("promises")
      .select("id, creator_id, counterparty_id, promisor_id, promisee_id")
      .eq("id", id)
      .maybeSingle();

    if (updatedPromise) {
      await dispatchNotificationEvent({
        admin,
        event: "accepted",
        promise: updatedPromise,
        actorId: user.id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

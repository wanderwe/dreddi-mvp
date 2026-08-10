import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { removeAgreementFollower } from "@/lib/agreements/followers";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { notifyAgreementWatchers } from "@/lib/notifications/watchers";
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

    // Allow counterparty to join even after creator activated without them,
    // as long as counterparty_id is not yet set (invite link still valid).
    const canJoinAfterActivation =
      promise.activated_without_counterparty &&
      !promise.counterparty_id &&
      promise.invite_status === "accepted";

    if (!canJoinAfterActivation) {
      if (promise.invite_status === "accepted" || promise.accepted_at || promise.counterparty_accepted_at) {
        return NextResponse.json({ ok: true, status: "accepted" }, { status: 200 });
      }

      if (promise.invite_status !== "awaiting_acceptance") {
        return NextResponse.json({ error: "Deal is not pending acceptance" }, { status: 400 });
      }
    }

    const nowIso = new Date().toISOString();
    const admin = getAdminClient();

    const updatePayload: {
      invite_status: "accepted";
      accepted_at: string;
      counterparty_accepted_at: string;
      declined_at: null;
      ignored_at: null;
      cancelled_at: null;
      promisor_id?: string;
    } = {
      invite_status: "accepted",
      accepted_at: nowIso,
      counterparty_accepted_at: nowIso,
      declined_at: null,
      ignored_at: null,
      cancelled_at: null,
    };

    if (!promise.promisor_id && (promise.counterparty_id === user.id || canJoinAfterActivation)) {
      updatePayload.promisor_id = user.id;
    }

    // When counterparty joins after creator activated without them,
    // also set counterparty_id and skip the invite_status filter (already "accepted").
    const updateQuery = admin.from("promises").update({
      ...updatePayload,
      ...(canJoinAfterActivation ? { counterparty_id: user.id } : {}),
    }).eq("id", id);

    const { error: updateError } = canJoinAfterActivation
      ? await updateQuery.eq("invite_status", "accepted")
      : await updateQuery.eq("invite_status", "awaiting_acceptance");

    if (updateError) {
      return NextResponse.json(
        { error: "Accept failed", detail: updateError.message },
        { status: 500 }
      );
    }

    const { error: followerRemoveError } = await removeAgreementFollower(admin, id, user.id);
    if (followerRemoveError) {
      console.error("[promises.accept] failed to remove follower for participant", {
        agreementId: id,
        userId: user.id,
        error: followerRemoveError.message,
      });
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

    await notifyAgreementWatchers(admin, promise, "public_agreement_accepted", { actorId: user.id });

    return NextResponse.json({ ok: true, status: "accepted" }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

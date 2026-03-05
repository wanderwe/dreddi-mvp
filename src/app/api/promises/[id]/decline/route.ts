import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createNotification, mapPriorityForType } from "@/lib/notifications/service";
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
      .select("id,title,creator_id,counterparty_id,promisee_id,invite_status,accepted_at,counterparty_accepted_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Lookup failed", detail: error.message }, { status: 500 });
    }

    if (!promise) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (promise.promisee_id !== user.id) {
      return NextResponse.json({ error: "Only assigned promisee can decline" }, { status: 403 });
    }

    const inviteStatus = getPromiseInviteStatus(promise);
    if (inviteStatus !== "awaiting_acceptance") {
      return NextResponse.json({ error: "Deal is not awaiting acceptance" }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await admin
      .from("promises")
      .update({
        invite_status: "declined",
        declined_at: nowIso,
        status: "declined",
        counterparty_id: promise.counterparty_id ?? user.id,
      })
      .eq("id", id)
      .eq("invite_status", "awaiting_acceptance");

    if (updateError) {
      return NextResponse.json(
        { error: "Could not decline deal", detail: updateError.message },
        { status: 500 }
      );
    }

    await admin
      .from("deal_invites")
      .update({ status: "declined" })
      .eq("deal_id", id)
      .eq("status", "created");

    await createNotification(admin, {
      userId: promise.creator_id,
      promiseId: id,
      type: "invite_declined",
      role: "creator",
      title: "Invitation declined",
      body: "The invited user declined this deal",
      dedupeKey: `invite_declined:${id}`,
      ctaUrl: `/promises/${id}`,
      priority: mapPriorityForType("invite_declined"),
    });

    return NextResponse.json({ ok: true, status: "declined" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { createNotification, mapPriorityForType } from "@/lib/notifications/service";
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
      return NextResponse.json(
        { error: "Creator cannot decline their own deal" },
        { status: 400 }
      );
    }

    if (promise.counterparty_id && promise.counterparty_id !== user.id) {
      return NextResponse.json(
        { error: "Only the selected counterparty can decline" },
        { status: 403 }
      );
    }

    if (promise.status === "declined" || promise.invite_status === "declined") {
      return NextResponse.json({ ok: true, status: "declined" }, { status: 200 });
    }

    if (promise.status !== "active" || promise.invite_status !== "awaiting_acceptance") {
      return NextResponse.json({ error: "Deal is not pending acceptance" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const admin = getAdminClient();

    const { error: updateError } = await admin
      .from("promises")
      .update({
        status: "declined",
        invite_status: "declined",
        declined_at: nowIso,
      })
      .eq("id", id)
      .eq("invite_status", "awaiting_acceptance");

    if (updateError) {
      return NextResponse.json(
        { error: "Decline failed", detail: updateError.message },
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
      promiseId: promise.id,
      type: "invite_declined",
      role: "creator",
      dedupeKey: `invite_declined:${promise.id}`,
      ctaUrl: `/promises/${promise.id}`,
      priority: mapPriorityForType("invite_declined"),
    });

    return NextResponse.json({ ok: true, status: "declined" }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

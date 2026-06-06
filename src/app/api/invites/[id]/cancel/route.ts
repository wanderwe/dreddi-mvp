import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { requireUser } from "@/lib/auth/requireUser";
import { createNotification, mapPriorityForType } from "@/lib/notifications/service";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const cookieStore = await cookies();
  const user = await requireUser(_req, cookieStore);
  if (user instanceof NextResponse) return user;

  const admin = getAdminClient();

  const { data: p, error } = await admin
    .from("promises")
    .select("id,creator_id,counterparty_id,invite_status,status,invite_token")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Invite lookup failed", detail: error.message }, { status: 500 });
  }

  if (!p) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (p.creator_id !== user.id) {
    return NextResponse.json({ error: "Only creator can withdraw invite" }, { status: 403 });
  }

  if (p.invite_status === "accepted" || p.invite_status === "declined" || p.invite_status === "expired") {
    return NextResponse.json({ ok: true, unchanged: true }, { status: 200 });
  }

  if (p.invite_status === "cancelled_by_creator") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await admin
    .from("promises")
    .update({
      invite_status: "cancelled_by_creator",
      cancelled_at: nowIso,
    })
    .eq("id", id)
    .eq("creator_id", user.id)
    .eq("invite_status", "awaiting_acceptance");

  if (updateError) {
    return NextResponse.json({ error: "Withdraw failed", detail: updateError.message }, { status: 500 });
  }

  await admin
    .from("deal_invites")
    .update({ status: "cancelled_by_creator", cancelled_at: nowIso })
    .eq("deal_id", id)
    .eq("status", "created");

  if (p.counterparty_id) {
    await createNotification(admin, {
      userId: p.counterparty_id,
      promiseId: p.id,
      type: "invite_ignored",
      role: "counterparty",
      title: "Agreement withdrawn",
      body: "The agreement was withdrawn by the creator before acceptance.",
      dedupeKey: `invite_cancelled:${p.id}`,
      ctaUrl: p.invite_token ? `/p/invite/${p.invite_token}` : `/promises/${p.id}`,
      priority: mapPriorityForType("invite_ignored"),
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

import { NextResponse } from "next/server";
import { getAdminClient } from "@/app/api/promises/[id]/common";
import { createNotification, mapPriorityForType } from "@/lib/notifications/service";

export async function POST(req: Request) {
  const secret = process.env.INVITES_CRON_SECRET;
  const auth = req.headers.get("authorization")?.replace(/Bearer\s+/i, "");

  if (secret && auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await admin
    .from("promises")
    .select("id,creator_id,invite_status,expires_at")
    .eq("invite_status", "awaiting_acceptance")
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch expirable invites", detail: error.message }, { status: 500 });
  }

  let expired = 0;

  for (const row of rows ?? []) {
    const { error: updateError } = await admin
      .from("promises")
      .update({ invite_status: "expired", ignored_at: nowIso })
      .eq("id", row.id)
      .eq("invite_status", "awaiting_acceptance");

    if (updateError) continue;

    await admin
      .from("deal_invites")
      .update({ status: "expired" })
      .eq("deal_id", row.id)
      .eq("status", "created");

    await createNotification(admin, {
      userId: row.creator_id,
      promiseId: row.id,
      type: "invite_ignored",
      role: "creator",
      title: "Invite expired",
      body: "No response was received before the invite expired.",
      dedupeKey: `invite_expired:${row.id}`,
      ctaUrl: `/promises/${row.id}`,
      priority: mapPriorityForType("invite_ignored"),
    });

    expired += 1;
  }

  return NextResponse.json({ ok: true, expired }, { status: 200 });
}

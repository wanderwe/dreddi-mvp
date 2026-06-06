import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "../[id]/common";
import { requireUser } from "@/lib/auth/requireUser";
import { createNotification, mapPriorityForType } from "@/lib/notifications/service";
import { getInviteExpiryIso } from "@/lib/inviteLifecycle";

type CreatePromisePayload = {
  title?: string;
  details?: string | null;
  conditionText?: string | null;
  secondPartyUserId?: string | null;
  dueAt?: string | null;
  executor?: "me" | "other";
  visibility?: "private" | "public";
  groupId?: string | null;
  isImportant?: boolean;
};

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const body = (await req.json().catch(() => null)) as CreatePromisePayload | null;

    const title = body?.title?.trim();
    const secondPartyUserId = body?.secondPartyUserId?.trim();
    const executor = body?.executor === "other" ? "other" : "me";

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (secondPartyUserId === user.id) {
      return NextResponse.json({ error: "Counterparty cannot be the same as creator" }, { status: 400 });
    }

    const dueAt = body?.dueAt ? new Date(body.dueAt) : null;
    const dueAtIso = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt.toISOString() : null;
    // Short URL-safe token (10 chars) — shared as dreddi.com/join/:token
    const _chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const _bytes = crypto.getRandomValues(new Uint8Array(10));
    const inviteToken = Array.from(_bytes, b => _chars[b % _chars.length]).join("");
    const nowIso = new Date().toISOString();

    const admin = getAdminClient();
    const requestedVisibility = body?.visibility === "private" ? "private" : "public";
    const groupId = body?.groupId?.trim() || null;
    const isImportant = body?.isImportant === true;

    const { data: profileRow } = await admin
      .from("profiles")
      .select("is_public_profile")
      .eq("id", user.id)
      .maybeSingle();

    const visibility =
      requestedVisibility === "public" && profileRow?.is_public_profile ? "public" : "private";
    const expiresAtIso = getInviteExpiryIso(new Date(nowIso), visibility);

    if (groupId) {
      const { data: groupRow } = await admin
        .from("promise_groups")
        .select("id")
        .eq("id", groupId)
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (!groupRow?.id) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }
    }

    let counterpartyProfile: { id: string } | null = null;
    if (secondPartyUserId) {
      const { data } = await admin
        .from("profiles")
        .select("id")
        .eq("id", secondPartyUserId)
        .maybeSingle();
      if (!data?.id) {
        return NextResponse.json({ error: "Counterparty not found" }, { status: 404 });
      }
      counterpartyProfile = { id: data.id };
    }

    const insertPayload = {
      creator_id: user.id,
      promisor_id: executor === "me" ? user.id : null,
      promisee_id: executor === "other" ? user.id : null,
      title,
      details: body?.details?.trim() || null,
      condition_text: body?.conditionText?.trim() || null,
      counterparty_contact: null,
      due_at: dueAtIso,
      status: "active",
      invite_token: inviteToken,
      counterparty_id: counterpartyProfile?.id ?? null,
      invite_status: "awaiting_acceptance",
      invited_at: nowIso,
      accepted_at: null,
      declined_at: null,
      ignored_at: null,
      expires_at: expiresAtIso,
      cancelled_at: null,
      visibility,
      promise_mode: "deal",
      group_id: groupId,
      is_important: isImportant,
    };

    const { data: insertData, error: insertError } = await admin
      .from("promises")
      .insert(insertPayload)
      .select("id, invite_token, counterparty_id")
      .single();

    if (insertError || !insertData) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[promises:create] Insert failed", {
          code: insertError?.code,
          message: insertError?.message,
          details: insertError?.details,
          hint: insertError?.hint,
        });
      }
      return NextResponse.json(
        { error: insertError?.message ?? "Insert failed" },
        { status: 400 }
      );
    }

    if (counterpartyProfile?.id) {
      const { error: inviteError } = await admin.from("deal_invites").insert({
        deal_id: insertData.id,
        inviter_id: user.id,
        invitee_id: counterpartyProfile.id,
        status: "created",
        created_at: nowIso,
        expires_at: expiresAtIso,
        cancelled_at: null,
      });

      if (inviteError) {
        return NextResponse.json({ error: "Failed to create deal invite" }, { status: 500 });
      }

      await createNotification(admin, {
        userId: counterpartyProfile.id,
        promiseId: insertData.id,
        type: "invite",
        role: "counterparty",
        title: "New deal invitation",
        body: "You have been invited to a deal",
        dedupeKey: `invite:${insertData.id}:${counterpartyProfile.id}`,
        ctaUrl: `/p/invite/${insertData.invite_token}`,
        priority: mapPriorityForType("invite"),
      });
    }

    return NextResponse.json({ id: insertData.id }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "../[id]/common";
import { requireUser } from "@/lib/auth/requireUser";
import { createNotification, mapPriorityForType } from "@/lib/notifications/service";

type CreatePromisePayload = {
  title?: string;
  details?: string | null;
  conditionText?: string | null;
  secondPartyUserId?: string | null;
  inviteByLink?: boolean;
  dueAt?: string | null;
  executor?: "me" | "other";
  visibility?: "private" | "public";
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
    const inviteByLink = body?.inviteByLink === true;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!secondPartyUserId && !inviteByLink) {
      return NextResponse.json({ error: "Counterparty is required" }, { status: 400 });
    }

    if (secondPartyUserId === user.id) {
      return NextResponse.json({ error: "Counterparty cannot be the same as creator" }, { status: 400 });
    }

    const dueAt = body?.dueAt ? new Date(body.dueAt) : null;
    const dueAtIso = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt.toISOString() : null;
    const inviteToken =
      crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const admin = getAdminClient();
    const requestedVisibility = body?.visibility === "private" ? "private" : "public";

    const { data: profileRow } = await admin
      .from("profiles")
      .select("is_public_profile")
      .eq("id", user.id)
      .maybeSingle();

    const visibility =
      requestedVisibility === "public" && profileRow?.is_public_profile ? "public" : "private";

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
      invited_at: new Date().toISOString(),
      accepted_at: null,
      declined_at: null,
      ignored_at: null,
      visibility,
      promise_mode: "deal",
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
      const nowIso = new Date().toISOString();
      const { error: inviteError } = await admin.from("deal_invites").insert({
        deal_id: insertData.id,
        inviter_id: user.id,
        invitee_id: counterpartyProfile.id,
        status: "pending",
        created_at: nowIso,
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
        ctaUrl: `/promises/${insertData.id}`,
        priority: mapPriorityForType("invite"),
      });
    }

    return NextResponse.json({ id: insertData.id }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

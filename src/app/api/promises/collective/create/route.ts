import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "../../[id]/common";
import { requireUser } from "@/lib/auth/requireUser";
import { createNotification, mapPriorityForType } from "@/lib/notifications/service";
import { getInviteExpiryIso } from "@/lib/inviteLifecycle";

type CreateCollectiveAgreementPayload = {
  title?: string;
  details?: string | null;
  conditionText?: string | null;
  dueAt?: string | null;
  visibility?: "private" | "public";
  isImportant?: boolean;
  participantUserIds?: string[];
};

const generateInviteToken = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
};

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const body = (await req.json().catch(() => null)) as CreateCollectiveAgreementPayload | null;

    const title = body?.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const participantIds = Array.from(
      new Set((body?.participantUserIds ?? []).map((id) => id?.trim()).filter(Boolean))
    ).filter((id) => id !== user.id);

    if (participantIds.length === 0) {
      return NextResponse.json({ error: "At least one participant is required" }, { status: 400 });
    }

    const dueAt = body?.dueAt ? new Date(body.dueAt) : null;
    const dueAtIso = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt.toISOString() : null;
    const nowIso = new Date().toISOString();

    const admin = getAdminClient();
    const { data: profileRow } = await admin
      .from("profiles")
      .select("is_public_profile")
      .eq("id", user.id)
      .maybeSingle();

    const requestedVisibility = body?.visibility === "private" ? "private" : "public";
    const visibility =
      requestedVisibility === "public" && profileRow?.is_public_profile ? "public" : "private";
    const isImportant = body?.isImportant === true;
    const conditionText = body?.conditionText?.trim() || null;
    const details = body?.details?.trim() || null;

    const { data: participantProfiles, error: participantsError } = await admin
      .from("profiles")
      .select("id")
      .in("id", participantIds);

    if (participantsError) {
      return NextResponse.json({ error: "Failed to resolve participants" }, { status: 500 });
    }

    const validParticipantIds = (participantProfiles ?? []).map((row) => row.id as string);
    if (validParticipantIds.length === 0) {
      return NextResponse.json({ error: "No valid participants found" }, { status: 404 });
    }

    const { data: agreement, error: agreementError } = await admin
      .from("collective_agreements")
      .insert({
        creator_id: user.id,
        title,
        details,
        condition_text: conditionText,
        due_at: dueAtIso,
        visibility,
        is_important: isImportant,
      })
      .select("id")
      .single();

    if (agreementError || !agreement) {
      return NextResponse.json(
        { error: agreementError?.message ?? "Insert failed" },
        { status: 400 }
      );
    }

    const expiresAtIso = getInviteExpiryIso(new Date(nowIso), visibility);

    const promiseRows = validParticipantIds.map((participantId) => ({
      creator_id: user.id,
      promisor_id: null,
      promisee_id: user.id,
      counterparty_id: participantId,
      title,
      details,
      condition_text: conditionText,
      counterparty_contact: null,
      due_at: dueAtIso,
      status: "active",
      invite_token: generateInviteToken(),
      invite_status: "awaiting_acceptance",
      invited_at: nowIso,
      accepted_at: null,
      declined_at: null,
      ignored_at: null,
      expires_at: expiresAtIso,
      cancelled_at: null,
      visibility,
      promise_mode: "deal",
      group_id: null,
      is_important: isImportant,
      collective_agreement_id: agreement.id,
    }));

    const { data: insertedPromises, error: insertError } = await admin
      .from("promises")
      .insert(promiseRows)
      .select("id, invite_token, counterparty_id");

    if (insertError || !insertedPromises) {
      return NextResponse.json(
        { error: insertError?.message ?? "Insert failed" },
        { status: 400 }
      );
    }

    const dealInviteRows = insertedPromises.map((row) => ({
      deal_id: row.id,
      inviter_id: user.id,
      invitee_id: row.counterparty_id as string,
      status: "created",
      created_at: nowIso,
      expires_at: expiresAtIso,
      cancelled_at: null,
    }));

    await admin.from("deal_invites").insert(dealInviteRows);

    await Promise.all(
      insertedPromises.map((row) =>
        createNotification(admin, {
          userId: row.counterparty_id as string,
          promiseId: row.id,
          type: "invite",
          role: "counterparty",
          title: "New deal invitation",
          body: "You have been invited to a deal",
          dedupeKey: `invite:${row.id}:${row.counterparty_id}`,
          ctaUrl: `/p/invite/${row.invite_token}`,
          priority: mapPriorityForType("invite"),
        })
      )
    );

    return NextResponse.json({ id: agreement.id }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

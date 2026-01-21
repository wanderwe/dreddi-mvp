import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "../[id]/common";
import { requireUser } from "@/lib/auth/requireUser";
import { isGroupDealsEnabled } from "@/lib/featureFlags";
import {
  buildCtaUrl,
  buildDedupeKey,
  createNotification,
  mapPriorityForType,
} from "@/lib/notifications/service";

type CreatePromisePayload = {
  title?: string;
  details?: string | null;
  conditionText?: string | null;
  counterpartyContact?: string | null;
  dueAt?: string | null;
  executor?: "me" | "other";
  visibility?: "private" | "public";
  acceptanceMode?: "all" | "threshold";
  acceptanceThreshold?: number | null;
  participants?: string[] | null;
};

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const body = (await req.json().catch(() => null)) as CreatePromisePayload | null;

    const title = body?.title?.trim();
    const counterpartyContact = body?.counterpartyContact?.trim() || null;
    const executor = body?.executor === "other" ? "other" : "me";
    const acceptanceMode = body?.acceptanceMode === "threshold" ? "threshold" : "all";
    const acceptanceThreshold =
      typeof body?.acceptanceThreshold === "number" && Number.isFinite(body.acceptanceThreshold)
        ? Math.trunc(body.acceptanceThreshold)
        : null;
    const rawParticipants = Array.isArray(body?.participants) ? body?.participants : [];
    const participantContacts = Array.from(
      new Set(rawParticipants.map((value) => value?.trim()).filter(Boolean))
    ) as string[];
    const groupDealRequested =
      acceptanceMode === "threshold" || participantContacts.length > 1;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!groupDealRequested && !counterpartyContact) {
      return NextResponse.json({ error: "Counterparty is required" }, { status: 400 });
    }

    const dueAt = body?.dueAt ? new Date(body.dueAt) : null;
    const dueAtIso = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt.toISOString() : null;

    const inviteToken =
      crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const admin = getAdminClient();
    const groupDealsEnabled = isGroupDealsEnabled(user);
    if (groupDealRequested && !groupDealsEnabled) {
      return NextResponse.json({ error: "Group deals are not enabled yet" }, { status: 403 });
    }
    const requestedVisibility = body?.visibility === "public" ? "public" : "private";

    const { data: profileRow } = await admin
      .from("profiles")
      .select("is_public_profile")
      .eq("id", user.id)
      .maybeSingle();

    const visibility =
      requestedVisibility === "public" && profileRow?.is_public_profile ? "public" : "private";

    const { data: matchingProfile } =
      !groupDealRequested && counterpartyContact
        ? await admin
            .from("profiles")
            .select("id")
            .ilike("email", counterpartyContact)
            .maybeSingle()
        : { data: null };

    const counterpartyId =
      !groupDealRequested && matchingProfile?.id && matchingProfile.id !== user.id
        ? matchingProfile.id
        : null;

    if (groupDealRequested && acceptanceMode === "threshold") {
      if (!acceptanceThreshold || acceptanceThreshold < 1) {
        return NextResponse.json(
          { error: "Acceptance threshold must be at least 1" },
          { status: 400 }
        );
      }
      if (acceptanceThreshold > participantContacts.length) {
        return NextResponse.json(
          { error: "Acceptance threshold cannot exceed participant count" },
          { status: 400 }
        );
      }
    }

    if (groupDealRequested && participantContacts.length < 1) {
      return NextResponse.json({ error: "At least one participant is required" }, { status: 400 });
    }

    const insertPayload = {
      creator_id: user.id,
      promisor_id: executor === "me" ? user.id : null,
      promisee_id: executor === "other" ? user.id : null,
      title,
      details: body?.details?.trim() || null,
      condition_text: body?.conditionText?.trim() || null,
      counterparty_contact: groupDealRequested ? null : counterpartyContact,
      due_at: dueAtIso,
      status: "active",
      invite_token: groupDealRequested ? null : inviteToken,
      counterparty_id: counterpartyId,
      invite_status: groupDealRequested ? null : "awaiting_acceptance",
      invited_at: groupDealRequested ? null : new Date().toISOString(),
      accepted_at: groupDealRequested ? null : null,
      declined_at: groupDealRequested ? null : null,
      ignored_at: groupDealRequested ? null : null,
      visibility,
      acceptance_mode: acceptanceMode,
      acceptance_threshold: acceptanceMode === "threshold" ? acceptanceThreshold : null,
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

    const nowIso = new Date().toISOString();

    await admin
      .from("promise_notification_state")
      .upsert({
        promise_id: insertData.id,
        invite_notified_at: null,
        updated_at: nowIso,
      });

    if (!groupDealRequested && insertData.counterparty_id) {
      const created = await createNotification(admin, {
        userId: insertData.counterparty_id,
        promiseId: insertData.id,
        type: "invite",
        role: "executor",
        dedupeKey: buildDedupeKey(["invite", insertData.id]),
        ctaUrl: insertData.invite_token
          ? `/p/invite/${insertData.invite_token}`
          : buildCtaUrl(insertData.id),
        priority: mapPriorityForType("invite"),
      });

      if (created.created) {
        await admin
          .from("promise_notification_state")
          .update({ invite_notified_at: nowIso, updated_at: nowIso })
          .eq("promise_id", insertData.id);
      }
    }

    if (groupDealRequested) {
      const participantRows = [];
      const participantIds = new Set<string>();
      const participantContactSet = new Set<string>();
      for (const contact of participantContacts) {
        const { data: profile } = await admin
          .from("profiles")
          .select("id,email,handle")
          .or(`email.ilike.${contact},handle.eq.${contact}`)
          .maybeSingle();

        const participantId = profile?.id && profile.id !== user.id ? profile.id : null;
        if (participantId === user.id) continue;
        if (participantId) {
          if (participantIds.has(participantId)) continue;
          participantIds.add(participantId);
        } else {
          const normalized = contact.toLowerCase();
          if (participantContactSet.has(normalized)) continue;
          participantContactSet.add(normalized);
        }

        participantRows.push({
          promise_id: insertData.id,
          participant_id: participantId,
          participant_contact: participantId ? null : contact,
          role: "participant",
          invite_status: "awaiting_acceptance",
          invited_at: nowIso,
          invited_by: user.id,
        });
      }

      if (!participantRows.length) {
        return NextResponse.json(
          { error: "No valid participants provided" },
          { status: 400 }
        );
      }
      if (
        acceptanceMode === "threshold" &&
        acceptanceThreshold &&
        participantRows.length < acceptanceThreshold
      ) {
        return NextResponse.json(
          { error: "Acceptance threshold cannot exceed participant count" },
          { status: 400 }
        );
      }

      const { data: participants, error: participantError } = await admin
        .from("promise_participants")
        .insert(participantRows)
        .select("id, participant_id");

      if (participantError || !participants) {
        return NextResponse.json(
          { error: participantError?.message ?? "Failed to create participants" },
          { status: 400 }
        );
      }

      const invitesPayload = participants.map((participant) => ({
        promise_participant_id: participant.id,
        invite_token:
          crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      }));

      const { data: invites, error: inviteError } = await admin
        .from("promise_participant_invites")
        .insert(invitesPayload)
        .select("invite_token, promise_participant_id");

      if (inviteError || !invites) {
        return NextResponse.json(
          { error: inviteError?.message ?? "Failed to create invite tokens" },
          { status: 400 }
        );
      }

      const inviteLookup = new Map(
        invites.map((invite) => [invite.promise_participant_id, invite.invite_token])
      );

      for (const participant of participants) {
        if (!participant.participant_id) continue;
        const token = inviteLookup.get(participant.id);
        if (!token) continue;
        await createNotification(admin, {
          userId: participant.participant_id,
          promiseId: insertData.id,
          type: "invite",
          role: "executor",
          dedupeKey: buildDedupeKey(["invite", insertData.id, participant.participant_id]),
          ctaUrl: `/p/invite/${token}`,
          priority: mapPriorityForType("invite"),
        });
      }
    }

    return NextResponse.json({ id: insertData.id }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

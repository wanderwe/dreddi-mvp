import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "../[id]/common";
import { requireUser } from "@/lib/auth/requireUser";
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
};

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const body = (await req.json().catch(() => null)) as CreatePromisePayload | null;

    const title = body?.title?.trim();
    const counterpartyContact = body?.counterpartyContact?.trim();
    const executor = body?.executor === "other" ? "other" : "me";

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!counterpartyContact) {
      return NextResponse.json({ error: "Counterparty is required" }, { status: 400 });
    }

    const dueAt = body?.dueAt ? new Date(body.dueAt) : null;
    const dueAtIso = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt.toISOString() : null;

    const inviteToken =
      crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const admin = getAdminClient();
    const requestedVisibility = body?.visibility === "public" ? "public" : "private";

    const { data: profileRow } = await admin
      .from("profiles")
      .select("is_public_profile")
      .eq("id", user.id)
      .maybeSingle();

    const visibility =
      requestedVisibility === "public" && profileRow?.is_public_profile ? "public" : "private";

    const { data: matchingProfile } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", counterpartyContact)
      .maybeSingle();

    const counterpartyId =
      matchingProfile?.id && matchingProfile.id !== user.id ? matchingProfile.id : null;

    const insertPayload = {
      creator_id: user.id,
      promisor_id: executor === "me" ? user.id : null,
      promisee_id: executor === "other" ? user.id : null,
      title,
      details: body?.details?.trim() || null,
      condition_text: body?.conditionText?.trim() || null,
      counterparty_contact: counterpartyContact,
      due_at: dueAtIso,
      status: "active",
      invite_token: inviteToken,
      counterparty_id: counterpartyId,
      invite_status: "awaiting_acceptance",
      invited_at: new Date().toISOString(),
      accepted_at: null,
      declined_at: null,
      ignored_at: null,
      visibility,
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

    if (!insertData.counterparty_id) {
      console.warn("[promises] missing counterparty id for invite notification", {
        promiseId: insertData.id,
        counterpartyContact,
        userId: user.id,
      });
    }

    if (insertData.counterparty_id) {
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

    return NextResponse.json({ id: insertData.id }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

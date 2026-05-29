import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { removeAgreementFollower } from "@/lib/agreements/followers";
import { resolveCounterpartyId } from "@/lib/promiseParticipants";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;

    const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anon = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const service = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    // 1) дістаємо bearer
    const auth = _req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const jwt = m?.[1];

    if (!jwt) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    // 2) валідуюємо користувача через anon клієнт
    const authClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);

    if (userErr || !userData.user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const userId = userData.user.id;

    // 3) parse optional conditionText from body
    let rawConditionText: string | null = null;
    try {
      const body = await _req.json();
      if (typeof body?.conditionText === "string") {
        rawConditionText = body.conditionText.trim() || null;
      }
    } catch {
      // no body or invalid JSON — proceed without conditionText
    }

    // 4) service client для обходу RLS (сервер only)
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 5) шукаємо promise по invite_token
    const { data: p, error: pErr } = await admin
      .from("promises")
      .select(
        "id, creator_id, counterparty_id, counterparty_accepted_at, invite_token, promisor_id, promisee_id, invite_status, expires_at, condition_text"
      )
      .eq("invite_token", token)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json(
        { error: "Invite lookup failed", detail: pErr.message },
        { status: 500 }
      );
    }

    if (!p) {
      return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
    }

    // не дозволяємо creator самому "accept"
    if (p.creator_id === userId) {
      return NextResponse.json({ error: "Creator cannot accept their own promise" }, { status: 400 });
    }
    if (p.counterparty_id && p.counterparty_id !== userId) {
      return NextResponse.json({ error: "Only the other side can accept" }, { status: 403 });
    }

    // awaiting_creator_confirmation — invitee already submitted, creator must respond
    if (p.invite_status === "awaiting_creator_confirmation") {
      return NextResponse.json({ error: "Awaiting creator confirmation" }, { status: 409 });
    }

    // якщо вже прийнято
    const alreadyAccepted = p.invite_status === "accepted" || Boolean(p.counterparty_accepted_at);
    if (p.invite_status === "declined" || p.invite_status === "expired" || p.invite_status === "cancelled_by_creator") {
      return NextResponse.json({ error: "Invite is no longer available" }, { status: 409 });
    }
    const alreadyParticipant =
      p.counterparty_id === userId || p.promisor_id === userId || p.promisee_id === userId;

    if (alreadyAccepted) {
      if (alreadyParticipant) {
        return NextResponse.json({ ok: true, alreadyAccepted: true }, { status: 200 });
      }
      return NextResponse.json({ error: "Already accepted by another user" }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    if (p.expires_at && new Date(p.expires_at).getTime() <= Date.now()) {
      await admin
        .from("promises")
        .update({ invite_status: "expired", ignored_at: nowIso })
        .eq("id", p.id)
        .eq("invite_status", "awaiting_acceptance");
      await admin
        .from("deal_invites")
        .update({ status: "expired" })
        .eq("deal_id", p.id)
        .eq("status", "created");
      return NextResponse.json({ error: "Invite is no longer available" }, { status: 409 });
    }

    // Determine promisor/promisee based on invite roles (same as before)
    const roleUpdate: { promisor_id?: string; promisee_id?: string } = {};
    if (p.promisor_id && !p.promisee_id) {
      roleUpdate.promisee_id = userId;
    } else if (p.promisee_id && !p.promisor_id) {
      roleUpdate.promisor_id = userId;
    } else if (!p.promisee_id && !p.promisor_id) {
      roleUpdate.promisor_id = userId;
      roleUpdate.promisee_id = p.creator_id;
    }

    // Determine if invitee is proposing a condition change
    const existingCondition = p.condition_text?.trim() ?? null;
    const hasConditionChange =
      rawConditionText !== null && rawConditionText !== existingCondition;

    if (hasConditionChange) {
      // Invitee proposes new/modified condition — put deal in awaiting_creator_confirmation
      const pendingUpdate: Record<string, unknown> = {
        counterparty_id: userId,
        invite_status: "awaiting_creator_confirmation",
        condition_text: rawConditionText,
        condition_proposed_by: userId,
        ...roleUpdate,
      };

      const { error: upErr } = await admin.from("promises").update(pendingUpdate).eq("id", p.id);
      if (upErr) {
        return NextResponse.json({ error: "Accept failed", detail: upErr.message }, { status: 500 });
      }

      // Fetch updated promise for notification
      const { data: updatedPromise } = await admin
        .from("promises")
        .select("id, creator_id, counterparty_id, promisor_id, promisee_id")
        .eq("id", p.id)
        .maybeSingle();

      if (updatedPromise) {
        await dispatchNotificationEvent({
          admin,
          event: "accepted",
          promise: updatedPromise,
          actorId: userId,
          title: undefined,
          body: undefined,
        });
      }

      return NextResponse.json({ ok: true, awaitingConfirmation: true }, { status: 200 });
    }

    // Normal accept — no condition change
    const updateData: {
      counterparty_id: string;
      counterparty_accepted_at: string;
      invite_status: "accepted";
      accepted_at: string;
      condition_responsible_id?: string | null;
      promisor_id?: string;
      promisee_id?: string;
    } = {
      counterparty_id: userId,
      counterparty_accepted_at: nowIso,
      invite_status: "accepted",
      accepted_at: nowIso,
      ...roleUpdate,
    };

    // Set condition_responsible_id if there is a condition
    if (existingCondition) {
      const resolvedRoles = {
        creator_id: p.creator_id,
        promisor_id: roleUpdate.promisor_id ?? p.promisor_id ?? null,
        promisee_id: roleUpdate.promisee_id ?? p.promisee_id ?? null,
        counterparty_id: userId,
      };
      updateData.condition_responsible_id = resolveCounterpartyId(resolvedRoles);
    }

    const { error: upErr } = await admin.from("promises").update(updateData).eq("id", p.id);

    if (upErr) {
      return NextResponse.json({ error: "Accept failed", detail: upErr.message }, { status: 500 });
    }

    const { error: followerRemoveError } = await removeAgreementFollower(admin, p.id, userId);
    if (followerRemoveError) {
      console.error("[invite.accept] failed to remove follower for participant", {
        agreementId: p.id,
        userId,
        error: followerRemoveError.message,
      });
    }

    await admin
      .from("deal_invites")
      .update({ status: "accepted" })
      .eq("deal_id", p.id)
      .eq("status", "created");

    // підвантажуємо учасників після апдейту і генеруємо нотифікації
    const { data: updatedPromise, error: updErr } = await admin
      .from("promises")
      .select("id, creator_id, counterparty_id, promisor_id, promisee_id")
      .eq("id", p.id)
      .maybeSingle();

    if (updErr) {
      return NextResponse.json(
        { error: "Accept succeeded but fetch failed", detail: updErr.message },
        { status: 500 }
      );
    }

    if (updatedPromise) {
      await dispatchNotificationEvent({
        admin,
        event: "accepted",
        promise: updatedPromise,
        actorId: userId,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "API crashed", message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import {
  buildCtaUrl,
  buildDedupeKey,
  createNotification,
  mapPriorityForType,
} from "@/lib/notifications/service";
import { logMissingNotificationRecipient } from "@/lib/notifications/diagnostics";

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

    // 3) service client для обходу RLS (сервер only)
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4) шукаємо promise по invite_token
    const { data: p, error: pErr } = await admin
      .from("promises")
      .select(
        "id, creator_id, counterparty_id, counterparty_accepted_at, invite_token, promisor_id, promisee_id, invite_status"
      )
      .eq("invite_token", token)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json({ error: "Invite lookup failed", detail: pErr.message }, { status: 500 });
    }

    if (!p) {
      return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
    }

    // не дозволяємо creator самому “accept”
    if (p.creator_id === userId) {
      return NextResponse.json({ error: "Creator cannot accept their own promise" }, { status: 400 });
    }
    if (p.counterparty_id && p.counterparty_id !== userId) {
      return NextResponse.json({ error: "Only the other side can accept" }, { status: 403 });
    }

    // якщо вже прийнято
    const alreadyAccepted =
      p.invite_status === "accepted" || Boolean(p.counterparty_accepted_at);
    if (p.invite_status === "declined" || p.invite_status === "ignored") {
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
    const updateData: {
      counterparty_id: string;
      counterparty_accepted_at: string;
      invite_status: "accepted";
      accepted_at: string;
      promisor_id?: string;
      promisee_id?: string;
    } = {
      counterparty_id: userId,
      counterparty_accepted_at: nowIso,
      invite_status: "accepted",
      accepted_at: nowIso,
    };

    let acceptingRole: "promisor" | "promisee" | null = null;

    if (p.promisor_id && !p.promisee_id) {
      updateData.promisee_id = userId;
      acceptingRole = "promisee";
    } else if (p.promisee_id && !p.promisor_id) {
      updateData.promisor_id = userId;
      acceptingRole = "promisor";
    } else if (!p.promisee_id && !p.promisor_id) {
      updateData.promisor_id = userId;
      updateData.promisee_id = p.creator_id;
      acceptingRole = "promisor";
    }

    // 5) пишемо counterparty_id
    const { error: upErr } = await admin
      .from("promises")
      .update(updateData)
      .eq("id", p.id);

    if (upErr) {
      return NextResponse.json({ error: "Accept failed", detail: upErr.message }, { status: 500 });
    }

    const { data: updatedPromise } = await admin
      .from("promises")
      .select("id, creator_id, counterparty_id, promisor_id, promisee_id")
      .eq("id", p.id)
      .single();

    if (updatedPromise) {
      const executorId = resolveExecutorId(updatedPromise);

      if (executorId) {
        await createNotification(admin, {
          userId: executorId,
          promiseId: updatedPromise.id,
          type: "invite_followup",
          role: "executor",
          dedupeKey: buildDedupeKey(["invite_followup", updatedPromise.id, "executor"]),
          ctaUrl: buildCtaUrl(updatedPromise.id),
          priority: mapPriorityForType("invite_followup"),
        });
      } else {
        logMissingNotificationRecipient({
          promiseId: updatedPromise.id,
          creatorId: updatedPromise.creator_id,
          promisorId: updatedPromise.promisor_id,
          promiseeId: updatedPromise.promisee_id,
          counterpartyId: updatedPromise.counterparty_id,
          flowName: "invite_accepted",
          recipientRole: "executor",
        });
      }

      await createNotification(admin, {
        userId: updatedPromise.creator_id,
        promiseId: updatedPromise.id,
        type: "invite_followup",
        role: "creator",
        dedupeKey: buildDedupeKey(["invite_followup", updatedPromise.id, "creator"]),
        ctaUrl: buildCtaUrl(updatedPromise.id),
        priority: mapPriorityForType("invite_followup"),
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "API crashed", message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildCtaUrl,
  buildDedupeKey,
  createNotification,
  getUserNotificationSettings,
  mapPriorityForType,
} from "@/lib/notifications/service";
import { getInviteResponseCopy, resolveInviteActorName } from "@/lib/notifications/inviteResponses";

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

    const auth = _req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const jwt = m?.[1];

    if (!jwt) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const authClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);

    if (userErr || !userData.user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const userId = userData.user.id;

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: p, error: pErr } = await admin
      .from("promises")
      .select("id, title, creator_id, counterparty_id, counterparty_accepted_at, invite_status")
      .eq("invite_token", token)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json({ error: "Invite lookup failed", detail: pErr.message }, { status: 500 });
    }

    if (!p) {
      return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
    }

    if (p.creator_id === userId) {
      return NextResponse.json({ error: "Creator cannot decline their own promise" }, { status: 400 });
    }

    if (p.counterparty_id && p.counterparty_id !== userId) {
      return NextResponse.json({ error: "Only the counterparty can decline" }, { status: 403 });
    }

    const inviteStatus = p.invite_status;

    if (inviteStatus === "accepted" || p.counterparty_accepted_at) {
      return NextResponse.json({ error: "Invite already accepted" }, { status: 409 });
    }

    if (inviteStatus === "declined" || inviteStatus === "ignored") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const nowIso = new Date().toISOString();

    const updatePayload: {
      invite_status: "declined";
      declined_at: string;
      status: "declined";
      counterparty_id?: string;
    } = {
      invite_status: "declined",
      declined_at: nowIso,
      status: "declined",
    };

    if (!p.counterparty_id) {
      updatePayload.counterparty_id = userId;
    }

    const { error: updateError } = await admin
      .from("promises")
      .update(updatePayload)
      .eq("id", p.id);

    if (updateError) {
      return NextResponse.json({ error: "Decline failed", detail: updateError.message }, { status: 500 });
    }

    const { data: actorProfile } = await admin
      .from("profiles")
      .select("handle,display_name")
      .eq("id", userId)
      .maybeSingle();

    const settings = await getUserNotificationSettings(admin, p.creator_id);
    const copy = getInviteResponseCopy({
      locale: settings.locale,
      response: "declined",
      actorName: resolveInviteActorName(actorProfile),
      dealTitle: p.title ?? null,
    });

    await createNotification(admin, {
      userId: p.creator_id,
      promiseId: p.id,
      type: "invite_declined",
      role: "creator",
      dedupeKey: buildDedupeKey(["invite_declined", p.id]),
      ctaUrl: buildCtaUrl(p.id),
      ctaLabel: copy.ctaLabel,
      priority: mapPriorityForType("invite_declined"),
      title: copy.title,
      body: copy.body,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "API crashed", message }, { status: 500 });
  }
}

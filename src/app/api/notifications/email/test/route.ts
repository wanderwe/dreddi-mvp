import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { maybeSendNotificationEmail } from "@/lib/notifications/email";

const getEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const match = auth.match(/^Bearer\s+(.+)$/i);
    const jwt = match?.[1];

    if (!jwt) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anon = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const service = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser(jwt);

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const userId = userData.user.id;
    const dedupeKey = `email_test:${userId}:${Date.now()}`;
    const ctaUrl = "/notifications";

    const { data: insertedNotification, error: insertError } = await admin
      .from("notifications")
      .insert({
        user_id: userId,
        promise_id: null,
        type: "invite",
        title: "Dreddi email test",
        body: "This is a test email from your Dreddi notification settings.",
        cta_label: "Open notifications",
        cta_url: ctaUrl,
        priority: "low",
        dedupe_key: dedupeKey,
      })
      .select("id")
      .single();

    if (insertError || !insertedNotification) {
      return NextResponse.json(
        { error: "Failed to create test notification", detail: insertError?.message },
        { status: 500 }
      );
    }

    await maybeSendNotificationEmail(admin, {
      eventId: insertedNotification.id,
      userId,
      promiseId: null,
      type: "invite",
      dedupeKey,
      ctaUrl,
      title: "Dreddi email test",
      body: "This is a test email from your Dreddi notification settings.",
    });

    const { data: sendLog, error: logError } = await admin
      .from("notification_email_sends")
      .select("id,status,provider,provider_id,error_message,created_at,to_email")
      .eq("event_id", insertedNotification.id)
      .maybeSingle();

    if (logError) {
      return NextResponse.json(
        { error: "Could not load send log", detail: logError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, notificationId: insertedNotification.id, sendLog });
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

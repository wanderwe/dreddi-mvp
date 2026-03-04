import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getConfiguredEmailProvider } from "@/lib/notifications/email";

const getEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

export async function GET(req: Request) {
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

    const { data: lastAttempt, error: attemptError } = await admin
      .from("notification_email_sends")
      .select("status,created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attemptError) {
      return NextResponse.json(
        { error: "Could not load email health", detail: attemptError.message },
        { status: 500 }
      );
    }

    const providerConfigured = getConfiguredEmailProvider() !== "none";

    return NextResponse.json({
      providerConfigured: providerConfigured,
      lastAttempt: lastAttempt
        ? {
            status: lastAttempt.status,
            createdAt: lastAttempt.created_at,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

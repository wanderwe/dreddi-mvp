import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";

type PromiseRecord = {
  id: string;
  title: string;
  details: string | null;
  status: PromiseStatus;
  due_at: string | null;
  creator_id: string;
  counterparty_id: string | null;
  promisor_id: string | null;
  promisee_id: string | null;
  completed_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  disputed_code: string | null;
  dispute_reason: string | null;
};

export const DISPUTE_CODES = ["not_completed", "partial", "late", "other"] as const;
export type DisputeCode = (typeof DISPUTE_CODES)[number];

export function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

export async function requireUser(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

  const token = auth.replace(/Bearer\s+/i, "");
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return data.user;
}

export function getAdminClient() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const service = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function loadPromiseForUser(id: string, userId: string) {
  const admin = getAdminClient();

  const { data: promise, error } = await admin
    .from("promises")
    .select(
      "id,title,details,status,due_at,creator_id,counterparty_id,promisor_id,promisee_id,completed_at,confirmed_at,disputed_at,disputed_code,dispute_reason"
    )
    .eq("id", id)
    .maybeSingle<PromiseRecord>();

  if (error) {
    return NextResponse.json({ error: "Lookup failed", detail: error.message }, { status: 500 });
  }

  if (!promise) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isPromiseStatus(promise.status)) {
    return NextResponse.json({ error: "Deal has unsupported status" }, { status: 400 });
  }

  if (promise.creator_id !== userId && promise.counterparty_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return promise;
}

export async function resolveCreatorLabel(creatorId: string) {
  const admin = getAdminClient();
  try {
    const { data } = await admin.auth.admin.getUserById(creatorId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

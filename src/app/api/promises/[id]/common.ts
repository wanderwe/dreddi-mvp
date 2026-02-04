import { NextResponse } from "next/server";
import { isPromiseStatus } from "@/lib/promiseStatus";
import type { PromiseRowMin } from "@/lib/promiseTypes";
import { createClient } from "@supabase/supabase-js";

type PromiseRecord = PromiseRowMin & {
  details: string | null;
};

export const DISPUTE_CODES = ["not_completed", "partial", "late", "other"] as const;
export type DisputeCode = (typeof DISPUTE_CODES)[number];

export function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
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
      "id,title,details,status,promise_type,due_at,creator_id,counterparty_id,promisor_id,promisee_id,completed_at,confirmed_at,disputed_at,disputed_code,dispute_reason,condition_text,condition_met_at,condition_met_by,invite_status,invited_at,accepted_at,declined_at,ignored_at"
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

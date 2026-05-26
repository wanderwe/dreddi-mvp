import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/requireUser";
import { isPromiseStatus } from "@/lib/promiseStatus";
import { getPromiseUiStatus } from "@/lib/promiseUiStatus";
import { getAgreementParticipantIds } from "@/lib/agreements/followers";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function adminClient() {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const user = await requireUser(req, cookieStore);
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "12", 10);
  const offsetParam = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
  const limit = Number.isNaN(limitParam) ? 12 : Math.min(Math.max(limitParam, 1), 50);
  const offset = Number.isNaN(offsetParam) ? 0 : Math.max(offsetParam, 0);
  const rangeEnd = offset + limit;

  const admin = adminClient();
  const { data, error } = await admin
    .from("agreement_followers")
    .select(
      "agreement_id,promises!inner(id,title,status,due_at,creator_id,counterparty_id,promisor_id,promisee_id,visibility,created_at,invite_status,accepted_at,counterparty_accepted_at,declined_at,ignored_at,expires_at,cancelled_at)"
    )
    .eq("user_id", user.id)
    .eq("promises.visibility", "public")
    .order("created_at", { ascending: false, referencedTable: "promises" })
    .range(offset, rangeEnd);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? [])
    .flatMap((row) => {
      const promise = Array.isArray(row.promises) ? row.promises[0] : row.promises;
      if (!promise || !isPromiseStatus(promise.status)) return [];
      if (getAgreementParticipantIds(promise).has(user.id)) return [];
      return [{ ...promise, ui_status: getPromiseUiStatus(promise) }];
    });

  return NextResponse.json({ rows });
}

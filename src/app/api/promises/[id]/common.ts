import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isPromiseStatus } from "@/lib/promiseStatus";
import type { PromiseRowMin } from "@/lib/promiseTypes";

type PromiseRecord = PromiseRowMin & {
  details: string | null;
  counterparty_accepted_at: string | null;
};

export const DISPUTE_CODES = ["not_completed", "partial", "late", "other"] as const;
export type DisputeCode = (typeof DISPUTE_CODES)[number];

export function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

type CookieStore = {
  get: (key: string) => { value: string } | undefined;
  set?: (key: string, value: string, options?: { path?: string; sameSite?: "lax" | "strict" | "none"; maxAge?: number }) => void;
  delete?: (key: string) => void;
};

export function createRouteHandlerClient({ cookies }: { cookies: CookieStore }) {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const projectRef = new URL(url).hostname.split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;

  const storage = {
    getItem: (key: string) => {
      const raw = cookies.get(key)?.value;
      if (!raw) return null;
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    },
    setItem: (key: string, value: string) => {
      cookies.set?.(key, encodeURIComponent(value), { path: "/", sameSite: "lax" });
    },
    removeItem: (key: string) => {
      if (cookies.delete) {
        cookies.delete(key);
      } else {
        cookies.set?.(key, "", { path: "/", maxAge: 0 });
      }
    },
  };

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, storage, storageKey },
  });
}

export async function requireUser(req: Request, cookies?: CookieStore) {
  if (cookies) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      return data.user;
    }
  }

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
      "id,title,details,status,due_at,creator_id,counterparty_id,counterparty_accepted_at,promisor_id,promisee_id,completed_at,confirmed_at,disputed_at,disputed_code,dispute_reason"
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

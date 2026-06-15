import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";

export const COMMITMENT_STATUSES = ["active", "completed", "failed", "abandoned"] as const;
export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

export const COMMITMENT_VISIBILITIES = ["public", "private"] as const;
export type CommitmentVisibility = (typeof COMMITMENT_VISIBILITIES)[number];

export function isCommitmentStatus(value: unknown): value is CommitmentStatus {
  return typeof value === "string" && (COMMITMENT_STATUSES as readonly string[]).includes(value);
}

export function isCommitmentVisibility(value: unknown): value is CommitmentVisibility {
  return typeof value === "string" && (COMMITMENT_VISIBILITIES as readonly string[]).includes(value);
}

export type SelfCommitmentRecord = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: CommitmentStatus;
  visibility: CommitmentVisibility;
  created_at: string;
  completed_at: string | null;
};

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function getAdminClient() {
  return createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getAuthClient() {
  return createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  return auth.replace(/Bearer\s+/i, "").trim() || null;
}

export async function getOptionalUser(req: Request): Promise<User | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  try {
    const { data, error } = await getAuthClient().auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export const SELF_COMMITMENT_COLUMNS =
  "id,user_id,title,description,deadline,status,visibility,created_at,completed_at";

export async function loadCommitmentForUser(id: string, userId: string) {
  const admin = getAdminClient();

  const { data: commitment, error } = await admin
    .from("self_commitments")
    .select(SELF_COMMITMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle<SelfCommitmentRecord>();

  if (error) {
    return NextResponse.json({ error: "Lookup failed", detail: error.message }, { status: 500 });
  }

  if (!commitment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (commitment.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return commitment;
}

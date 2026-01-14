import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";

type CookieStore = {
  get: (key: string) => { value: string } | undefined;
};

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

function decodeCookieValue(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function getAccessTokenFromCookie(cookies: CookieStore | undefined) {
  if (!cookies) return null;
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const projectRef = new URL(url).hostname.split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const raw = cookies.get(storageKey)?.value;
  if (!raw) return null;
  const decoded = decodeCookieValue(raw);
  try {
    const parsed = JSON.parse(decoded) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

function getAccessTokenFromHeader(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  return auth.replace(/Bearer\s+/i, "").trim() || null;
}

export async function requireUser(
  req: Request,
  cookies?: CookieStore
): Promise<User | NextResponse> {
  const token = getAccessTokenFromHeader(req) ?? getAccessTokenFromCookie(cookies);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

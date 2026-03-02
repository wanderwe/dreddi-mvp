import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";

type CookieStore = {
  get: (key: string) => { value: string } | undefined;
  getAll?: () => Array<{ name: string; value: string }>;
};

type SessionCookieShape = { access_token?: string } | [{ access_token?: string }, string?];

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

function getAuthCookieRawValue(cookies: CookieStore, storageKey: string) {
  const direct = cookies.get(storageKey)?.value;
  if (direct) return direct;

  if (!cookies.getAll) return null;

  const chunks = cookies
    .getAll()
    .filter((cookie) => cookie.name === storageKey || cookie.name.startsWith(`${storageKey}.`))
    .sort((a, b) => {
      if (a.name === storageKey) return -1;
      if (b.name === storageKey) return 1;
      const aIdx = Number.parseInt(a.name.slice(storageKey.length + 1), 10);
      const bIdx = Number.parseInt(b.name.slice(storageKey.length + 1), 10);
      if (Number.isNaN(aIdx) || Number.isNaN(bIdx)) return a.name.localeCompare(b.name);
      return aIdx - bIdx;
    });

  if (chunks.length === 0) return null;
  return chunks.map((chunk) => chunk.value).join("");
}

function getAccessTokenFromParsedCookie(parsed: SessionCookieShape) {
  if (Array.isArray(parsed)) {
    return parsed[0]?.access_token ?? null;
  }
  return parsed.access_token ?? null;
}

function getAccessTokenFromCookie(cookies: CookieStore | undefined) {
  if (!cookies) return null;
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const projectRef = new URL(url).hostname.split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const raw = getAuthCookieRawValue(cookies, storageKey);
  if (!raw) return null;
  const decoded = decodeCookieValue(raw);
  try {
    const parsed = JSON.parse(decoded) as SessionCookieShape;
    return getAccessTokenFromParsedCookie(parsed);
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

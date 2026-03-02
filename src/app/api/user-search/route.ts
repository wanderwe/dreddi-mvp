import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/requireUser";

type PublicStatsSearchRow = {
  profile_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ProfilesSearchRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const user = await requireUser(req, cookieStore);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ users: [] }, { status: 200 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Search failed", detail: "Supabase env is not configured" }, { status: 500 });
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const normalizedQuery = query.startsWith("@") ? query.slice(1) : query;
  const escaped = normalizedQuery.replace(/[,%]/g, "");
  if (escaped.length < 2) {
    return NextResponse.json({ users: [] }, { status: 200 });
  }

  const handlePrefix = `${escaped}%`;
  const nameContains = `%${escaped}%`;
  const searchFilter = `handle.ilike.${handlePrefix},display_name.ilike.${nameContains}`;

  const statsSearch = await supabase
    .from("public_profile_stats")
    .select("profile_id,handle,display_name,avatar_url")
    .neq("profile_id", user.id)
    .or(searchFilter)
    .limit(10)
    .returns<PublicStatsSearchRow[]>();

  let records: PublicStatsSearchRow[] = statsSearch.data ?? [];

  if (statsSearch.error) {
    const profilesSearch = await supabase
      .from("profiles")
      .select("id,handle,display_name,avatar_url")
      .eq("is_public_profile", true)
      .not("handle", "is", null)
      .neq("id", user.id)
      .or(searchFilter)
      .limit(10)
      .returns<ProfilesSearchRow[]>();

    if (profilesSearch.error) {
      return NextResponse.json(
        {
          error: "Search failed",
          detail: profilesSearch.error.message,
          fallbackDetail: statsSearch.error.message,
        },
        { status: 500 }
      );
    }

    records = (profilesSearch.data ?? []).map((row) => ({
      profile_id: row.id,
      handle: row.handle,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
    }));
  }

  const qLower = escaped.toLowerCase();
  const users = records
    .filter((row): row is PublicStatsSearchRow & { handle: string } => Boolean(row.handle?.trim()))
    .map((row) => ({
      id: row.profile_id,
      handle: row.handle.trim(),
      display_name: row.display_name,
      avatar_url: row.avatar_url,
    }))
    .sort((a, b) => {
      const aStarts = a.handle.toLowerCase().startsWith(qLower) ? 0 : 1;
      const bStarts = b.handle.toLowerCase().startsWith(qLower) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      const aName = (a.display_name ?? "").toLowerCase();
      const bName = (b.display_name ?? "").toLowerCase();
      const aContains = aName.includes(qLower) ? 0 : 1;
      const bContains = bName.includes(qLower) ? 0 : 1;
      if (aContains !== bContains) return aContains - bContains;
      return a.handle.localeCompare(b.handle);
    })
    .slice(0, 8);

  return NextResponse.json({ users }, { status: 200 });
}

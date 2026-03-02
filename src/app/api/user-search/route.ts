import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { getAdminClient } from "@/app/api/promises/[id]/common";

type SearchUserRow = {
  profile_id: string;
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

  const admin = getAdminClient();
  const normalizedQuery = query.startsWith("@") ? query.slice(1) : query;
  const escaped = normalizedQuery.replace(/[,%]/g, "");
  if (escaped.length < 2) {
    return NextResponse.json({ users: [] }, { status: 200 });
  }
  const handlePrefix = `${escaped}%`;
  const nameContains = `%${escaped}%`;

  const { data, error } = await admin
    .from("public_profile_stats")
    .select("profile_id,handle,display_name,avatar_url")
    .neq("profile_id", user.id)
    .or(`handle.ilike.${handlePrefix},display_name.ilike.${nameContains}`)
    .limit(10)
    .returns<SearchUserRow[]>();

  if (error) {
    return NextResponse.json({ error: "Search failed", detail: error.message }, { status: 500 });
  }

  const qLower = escaped.toLowerCase();
  const users = (data ?? [])
    .filter((row): row is SearchUserRow & { handle: string } => Boolean(row.handle?.trim()))
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

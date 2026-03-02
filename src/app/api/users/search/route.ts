import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { getAdminClient } from "@/app/api/promises/[id]/common";

type SearchUserRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  reputation_score: number | null;
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
  const escaped = query.replace(/[,%]/g, "");

  const { data, error } = await admin
    .from("profiles")
    .select("id,handle,display_name,avatar_url,reputation_score")
    .neq("id", user.id)
    .or(`handle.ilike.%${escaped}%,display_name.ilike.%${escaped}%`)
    .order("reputation_score", { ascending: false, nullsFirst: false })
    .limit(8)
    .returns<SearchUserRow[]>();

  if (error) {
    return NextResponse.json({ error: "Search failed", detail: error.message }, { status: 500 });
  }

  const users = (data ?? [])
    .filter((row): row is SearchUserRow & { handle: string } => Boolean(row.handle))
    .map((row) => ({
      ...row,
      handle: row.handle.trim(),
    }));

  return NextResponse.json({ users }, { status: 200 });
}

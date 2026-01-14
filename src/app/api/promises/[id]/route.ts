import { NextResponse } from "next/server";
import { loadPromiseForUser, requireUser, resolveCreatorLabel } from "./common";
import { cookies } from "next/headers";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const p = await loadPromiseForUser(id, user.id);
    if (p instanceof NextResponse) return p;

    const creator_display_name = await resolveCreatorLabel(p.creator_id);

    return NextResponse.json({ ...p, creator_display_name });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

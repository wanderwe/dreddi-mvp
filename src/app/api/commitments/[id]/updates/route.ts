import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { getAdminClient, loadCommitmentForUser } from "../../common";

type SelfCommitmentUpdateRecord = {
  id: string;
  commitment_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const commitment = await loadCommitmentForUser(id, user.id);
    if (commitment instanceof NextResponse) return commitment;

    const admin = getAdminClient();
    const { data: updates, error } = await admin
      .from("self_commitment_updates")
      .select("id,commitment_id,author_id,content,created_at")
      .eq("commitment_id", commitment.id)
      .order("created_at", { ascending: true })
      .returns<SelfCommitmentUpdateRecord[]>();

    if (error) {
      return NextResponse.json({ error: "Could not load goal updates", detail: error.message }, { status: 500 });
    }

    return NextResponse.json(
      (updates ?? []).map((update) => ({
        id: update.id,
        content: update.content,
        created_at: update.created_at,
      }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const payload = (await req.json().catch(() => null)) as { content?: unknown } | null;
    const content = typeof payload?.content === "string" ? payload.content.trim() : "";
    if (content.length < 1 || content.length > 500) {
      return NextResponse.json({ error: "Update content must be 1–500 characters" }, { status: 400 });
    }

    const commitment = await loadCommitmentForUser(id, user.id);
    if (commitment instanceof NextResponse) return commitment;

    const admin = getAdminClient();
    const { data: update, error } = await admin
      .from("self_commitment_updates")
      .insert({ commitment_id: commitment.id, author_id: user.id, content })
      .select("id,commitment_id,author_id,content,created_at")
      .single<SelfCommitmentUpdateRecord>();

    if (error) {
      return NextResponse.json({ error: "Could not create goal update", detail: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { id: update.id, content: update.content, created_at: update.created_at },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

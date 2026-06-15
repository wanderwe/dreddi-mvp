import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getAdminClient, SELF_COMMITMENT_COLUMNS, type SelfCommitmentRecord } from "@/app/api/commitments/common";

type SelfCommitmentUpdateRecord = {
  id: string;
  commitment_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const payload = (await req.json().catch(() => null)) as { content?: unknown } | null;
    const content = typeof payload?.content === "string" ? payload.content.trim() : "";
    if (content.length < 1 || content.length > 500) {
      return NextResponse.json({ error: "Update content must be 1–500 characters" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: commitment, error } = await admin
      .from("self_commitments")
      .select(SELF_COMMITMENT_COLUMNS)
      .eq("id", id)
      .eq("visibility", "public")
      .maybeSingle<SelfCommitmentRecord>();

    if (error) {
      return NextResponse.json({ error: "Public goal lookup failed", detail: error.message }, { status: 500 });
    }

    if (!commitment) {
      return NextResponse.json({ error: "Public goal not found" }, { status: 404 });
    }

    if (commitment.user_id !== user.id) {
      return NextResponse.json({ error: "Only the goal owner can add updates" }, { status: 403 });
    }

    const { data: update, error: insertError } = await admin
      .from("self_commitment_updates")
      .insert({ commitment_id: commitment.id, author_id: user.id, content })
      .select("id,commitment_id,author_id,content,created_at")
      .single<SelfCommitmentUpdateRecord>();

    if (insertError) {
      return NextResponse.json(
        { error: "Could not create goal update", detail: insertError.message },
        { status: 500 }
      );
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

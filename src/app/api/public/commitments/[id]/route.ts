import { NextResponse } from "next/server";
import {
  getAdminClient,
  getOptionalUser,
  SELF_COMMITMENT_COLUMNS,
  type SelfCommitmentRecord,
} from "@/app/api/commitments/common";

type SelfCommitmentUpdateRecord = {
  id: string;
  commitment_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

type PublicProfileRecord = {
  id: string;
  display_name: string | null;
  handle: string | null;
  is_public_profile: boolean | null;
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
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

    const { data: updates } = await admin
      .from("self_commitment_updates")
      .select("id,commitment_id,author_id,content,created_at")
      .eq("commitment_id", commitment.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .returns<SelfCommitmentUpdateRecord[]>();

    const { data: owner } = await admin
      .from("profiles")
      .select("id,display_name,handle,is_public_profile")
      .eq("id", commitment.user_id)
      .maybeSingle<PublicProfileRecord>();

    const user = await getOptionalUser(req);
    const viewerCanUpdate = Boolean(user?.id && user.id === commitment.user_id);

    return NextResponse.json({
      id: commitment.id,
      title: commitment.title,
      description: commitment.description,
      deadline: commitment.deadline,
      status: commitment.status,
      created_at: commitment.created_at,
      completed_at: commitment.completed_at,
      owner_display_name: owner?.display_name ?? null,
      owner_handle: owner?.is_public_profile ? owner.handle : null,
      viewer_can_update: viewerCanUpdate,
      updates: (updates ?? []).map((update) => ({
        id: update.id,
        content: update.content,
        created_at: update.created_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

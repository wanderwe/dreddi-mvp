import { NextResponse } from "next/server";
import { getAdminClient, SELF_COMMITMENT_COLUMNS, type SelfCommitmentRecord } from "@/app/api/commitments/common";

type PublicProfileRecord = {
  id: string;
  display_name: string | null;
  handle: string | null;
  is_public_profile: boolean | null;
};

export async function GET() {
  try {
    const admin = getAdminClient();

    const { data: commitments, error } = await admin
      .from("self_commitments")
      .select(SELF_COMMITMENT_COLUMNS)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<SelfCommitmentRecord[]>();

    if (error) {
      return NextResponse.json({ error: "Could not load public goals", detail: error.message }, { status: 500 });
    }

    const rows = commitments ?? [];
    const userIds = Array.from(new Set(rows.map((row) => row.user_id)));

    const { data: profiles } = userIds.length
      ? await admin
          .from("profiles")
          .select("id,display_name,handle,is_public_profile")
          .in("id", userIds)
          .returns<PublicProfileRecord[]>()
      : { data: [] as PublicProfileRecord[] };

    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

    return NextResponse.json(
      rows.map((row) => {
        const owner = profileById.get(row.user_id);
        return {
          ...row,
          owner_display_name: owner?.display_name ?? null,
          owner_handle: owner?.is_public_profile ? owner.handle : null,
        };
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

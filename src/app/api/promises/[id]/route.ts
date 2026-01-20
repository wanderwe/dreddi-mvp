import { NextResponse } from "next/server";
import { loadPromiseForUser, resolveCreatorLabel, getAdminClient } from "./common";
import { requireUser } from "@/lib/auth/requireUser";
import { cookies } from "next/headers";
import { isPromiseAccepted } from "@/lib/promiseAcceptance";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const p = await loadPromiseForUser(id, user.id);
    if (p instanceof NextResponse) return p;

    const creator_display_name = await resolveCreatorLabel(p.creator_id);
    const admin = getAdminClient();
    const { data: participantRows, error: participantError } = await admin
      .from("promise_participants")
      .select("invite_status")
      .eq("promise_id", p.id);

    if (participantError) {
      return NextResponse.json(
        { error: "Participant lookup failed", detail: participantError.message },
        { status: 500 }
      );
    }

    const participantCount = participantRows?.length ?? 0;
    const acceptedCount =
      participantRows?.filter((row) => row.invite_status === "accepted").length ?? 0;
    const isGroupDeal = participantCount > 0;
    const requiredCount =
      p.acceptance_mode === "threshold"
        ? p.acceptance_threshold ?? participantCount
        : participantCount;
    const isActive = isGroupDeal
      ? acceptedCount >= Math.max(requiredCount, 1)
      : isPromiseAccepted(p);

    return NextResponse.json({
      ...p,
      creator_display_name,
      participant_count: participantCount,
      accepted_count: acceptedCount,
      is_active: isActive,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

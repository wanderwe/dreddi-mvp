import { NextResponse } from "next/server";
import { getAdminClient } from "../../promises/[id]/common";
import { computeDealStreak } from "@/lib/reputation/streak";

type DealRow = {
  status: string | null;
  disputed_at: string | null;
  confirmed_at: string | null;
  updated_at: string | null;
};

export async function GET(_: Request, context: { params: Promise<{ handle: string }> }) {
  try {
    const { handle } = await context.params;
    if (!handle?.trim()) {
      return NextResponse.json({ error: "Handle is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id,handle")
      .eq("handle", handle)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json(
        { error: "Failed to load profile", detail: profileErr.message },
        { status: 500 }
      );
    }

    if (!profile?.id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { data: reputationRow, error: reputationErr } = await admin
      .from("user_reputation")
      .select("score")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (reputationErr) {
      return NextResponse.json(
        { error: "Failed to load reputation", detail: reputationErr.message },
        { status: 500 }
      );
    }

    const { data: deals, error: dealsErr } = await admin
      .from("promises")
      .select("status,disputed_at,confirmed_at,updated_at")
      .or(
        `promisor_id.eq.${profile.id},promisee_id.eq.${profile.id},creator_id.eq.${profile.id},counterparty_id.eq.${profile.id}`
      );

    if (dealsErr) {
      return NextResponse.json(
        { error: "Failed to load deals", detail: dealsErr.message },
        { status: 500 }
      );
    }

    const normalizedDeals = (deals ?? []) as DealRow[];
    const confirmedCount = normalizedDeals.filter((deal) => deal.status === "confirmed").length;
    const disputedCount = normalizedDeals.filter(
      (deal) => deal.status === "disputed" || Boolean(deal.disputed_at)
    ).length;
    const streak = computeDealStreak(normalizedDeals);

    return NextResponse.json({
      reputationScore: reputationRow?.score ?? 50,
      confirmedCount,
      disputedCount,
      streak,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

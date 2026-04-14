import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { getAdminClient } from "../[id]/common";

type PromiseStatsRow = {
  status: "confirmed" | "disputed";
  promisor_id: string | null;
  accepted_at: string | null;
};

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const user = await requireUser(req, cookieStore);
    if (user instanceof NextResponse) return user;

    const admin = getAdminClient();
    const url = new URL(req.url);
    const counterpartyId = url.searchParams.get("counterpartyId");

    const { data: actorDeals, error: actorDealsError } = await admin
      .from("promises")
      .select("status,promisor_id,accepted_at")
      .in("status", ["confirmed", "disputed"])
      .or(`creator_id.eq.${user.id},counterparty_id.eq.${user.id},promisor_id.eq.${user.id},promisee_id.eq.${user.id}`);

    if (actorDealsError) {
      return NextResponse.json({ error: "Failed to load actor metrics", detail: actorDealsError.message }, { status: 500 });
    }

    const actorRows = (actorDeals ?? []) as PromiseStatsRow[];
    const finalizedDealsCount = actorRows.length;
    const fulfilledCount = actorRows.filter((row) => row.status === "confirmed").length;
    const disputedCount = actorRows.filter((row) => row.status === "disputed").length;

    const acceptedResponsibleCount = actorRows.filter(
      (row) => row.promisor_id === user.id && row.accepted_at
    ).length;
    const completedResponsibleCount = actorRows.filter(
      (row) => row.promisor_id === user.id && row.status === "confirmed"
    ).length;

    const actorMetrics = {
      fulfilledRate:
        finalizedDealsCount > 0 ? (fulfilledCount / finalizedDealsCount) * 100 : undefined,
      completionRate:
        acceptedResponsibleCount > 0
          ? (completedResponsibleCount / acceptedResponsibleCount) * 100
          : undefined,
      disputeRate: finalizedDealsCount > 0 ? (disputedCount / finalizedDealsCount) * 100 : undefined,
      finalizedDealsCount,
    };

    let counterpartyMetrics: {
      priorFulfilledTogether?: number;
      responseRate?: number;
      isPublicProfile?: boolean;
    } | null = null;

    if (counterpartyId) {
      const { data: sharedDeals, error: sharedDealsError } = await admin
        .from("promises")
        .select("status")
        .eq("status", "confirmed")
        .or(
          `and(creator_id.eq.${user.id},counterparty_id.eq.${counterpartyId}),and(creator_id.eq.${counterpartyId},counterparty_id.eq.${user.id})`
        );

      if (sharedDealsError) {
        return NextResponse.json(
          { error: "Failed to load shared deal history", detail: sharedDealsError.message },
          { status: 500 }
        );
      }

      const priorFulfilledTogether = (sharedDeals ?? []).length;

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("is_public_profile")
        .eq("id", counterpartyId)
        .maybeSingle();

      if (profileError) {
        return NextResponse.json({ error: "Failed to load counterparty profile", detail: profileError.message }, { status: 500 });
      }

      const isPublicProfile = profile?.is_public_profile ?? false;
      let responseRate: number | undefined = undefined;

      if (isPublicProfile) {
        const { data: cpDeals, error: cpDealsError } = await admin
          .from("promises")
          .select("status")
          .in("status", ["confirmed", "disputed"])
          .or(
            `creator_id.eq.${counterpartyId},counterparty_id.eq.${counterpartyId},promisor_id.eq.${counterpartyId},promisee_id.eq.${counterpartyId}`
          );

        if (cpDealsError) {
          return NextResponse.json({ error: "Failed to load counterparty response metrics", detail: cpDealsError.message }, { status: 500 });
        }

        const finalizedCount = (cpDeals ?? []).length;
        const respondedCount = (cpDeals ?? []).filter((row) => row.status === "confirmed").length;
        responseRate = finalizedCount > 0 ? (respondedCount / finalizedCount) * 100 : undefined;
      }

      counterpartyMetrics = {
        priorFulfilledTogether,
        responseRate,
        isPublicProfile,
      };
    }

    return NextResponse.json({ actorMetrics, counterpartyMetrics });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

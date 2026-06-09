import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { getAdminClient } from "../[id]/common";

type PromiseStatsRow = {
  status: "confirmed" | "disputed";
  promisor_id: string | null;
  accepted_at: string | null;
};

const COUNTERPARTY_COLUMNS = ["creator_id", "counterparty_id", "promisor_id", "promisee_id"] as const;

export const buildSharedDealsOrFilter = (userId: string, counterpartyId: string) =>
  COUNTERPARTY_COLUMNS.flatMap((userColumn) =>
    COUNTERPARTY_COLUMNS.map(
      (counterpartyColumn) => `and(${userColumn}.eq.${userId},${counterpartyColumn}.eq.${counterpartyId})`
    )
  ).join(",");

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

    // Only count deals where the user was the promisor (executor) for rate calculations.
    // Including promisee/observer roles would inflate rates with deals the user didn't perform.
    const promisorRows = actorRows.filter((row) => row.promisor_id === user.id);
    const finalizedDealsCount = promisorRows.length;
    const fulfilledCount = promisorRows.filter((row) => row.status === "confirmed").length;
    const disputedCount = promisorRows.filter((row) => row.status === "disputed").length;

    const acceptedResponsibleCount = promisorRows.filter((row) => row.accepted_at).length;
    const completedResponsibleCount = promisorRows.filter((row) => row.status === "confirmed").length;

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
      fulfillmentRate?: number;
      isPublicProfile?: boolean;
    } | null = null;

    if (counterpartyId) {
      const { data: sharedDeals, error: sharedDealsError } = await admin
        .from("promises")
        .select("status")
        .eq("status", "confirmed")
        .or(buildSharedDealsOrFilter(user.id, counterpartyId));

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
      let fulfillmentRate: number | undefined = undefined;

      if (isPublicProfile) {
        const { data: cpDeals, error: cpDealsError } = await admin
          .from("promises")
          .select("status,promisor_id")
          .in("status", ["confirmed", "disputed"])
          .eq("promisor_id", counterpartyId);

        if (cpDealsError) {
          return NextResponse.json({ error: "Failed to load counterparty metrics", detail: cpDealsError.message }, { status: 500 });
        }

        const cpFinalizedCount = (cpDeals ?? []).length;
        const cpFulfilledCount = (cpDeals ?? []).filter((row) => row.status === "confirmed").length;
        fulfillmentRate = cpFinalizedCount > 0 ? (cpFulfilledCount / cpFinalizedCount) * 100 : undefined;
      }

      counterpartyMetrics = {
        priorFulfilledTogether,
        fulfillmentRate,
        isPublicProfile,
      };
    }

    return NextResponse.json({ actorMetrics, counterpartyMetrics });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Unexpected error", message }, { status: 500 });
  }
}

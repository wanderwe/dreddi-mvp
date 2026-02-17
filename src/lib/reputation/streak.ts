type StreakDeal = {
  status: string | null;
  disputed_at?: string | null;
  closed_at?: string | null;
  updated_at?: string | null;
  confirmed_at?: string | null;
};

const isClosedDeal = (deal: StreakDeal) =>
  deal.status === "confirmed" || deal.status === "disputed" || Boolean(deal.disputed_at);

const resolveClosedAt = (deal: StreakDeal) =>
  deal.closed_at ?? deal.confirmed_at ?? deal.disputed_at ?? deal.updated_at ?? null;

export const sortDealsByClosedDateDesc = <T extends StreakDeal>(deals: T[]) =>
  [...deals].sort((a, b) => {
    const aTime = resolveClosedAt(a);
    const bTime = resolveClosedAt(b);
    if (aTime && bTime) {
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    }
    if (aTime) return -1;
    if (bTime) return 1;
    return 0;
  });

export const computeDealStreak = (deals: StreakDeal[]) => {
  let streak = 0;

  const closedDeals = sortDealsByClosedDateDesc(deals.filter(isClosedDeal));
  for (const deal of closedDeals) {
    const hasDispute = Boolean(deal.disputed_at) || deal.status === "disputed";
    if (deal.status === "confirmed" && !hasDispute) {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
};

export type PaceMetricInput = {
  accepted_at: string | null;
  counterparty_accepted_at?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const getLifetimePaceMetrics = (
  promises: PaceMetricInput[],
  nowTimestamp = Date.now()
) => {
  const acceptedTimestamps = promises.flatMap((promise) => {
    const candidateTimestamps = [promise.accepted_at, promise.counterparty_accepted_at]
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter((value) => !Number.isNaN(value) && value <= nowTimestamp)
      .sort((a, b) => a - b);

    if (candidateTimestamps.length === 0) return [];

    return [candidateTimestamps[0]];
  });

  const totalDeals = acceptedTimestamps.length;

  if (totalDeals === 0) {
    return {
      totalDeals,
      activeDays: 0,
      pace: 0,
    };
  }

  const startAt = Math.min(...acceptedTimestamps);
  const activeDays = Math.max(1, Math.floor((nowTimestamp - startAt) / DAY_MS));
  const months = Math.max(1, activeDays / 30);
  const pace = Number((totalDeals / months).toFixed(1));

  return {
    totalDeals,
    activeDays,
    pace,
  };
};

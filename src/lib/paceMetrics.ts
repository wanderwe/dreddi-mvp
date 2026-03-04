export type PaceMetricInput = {
  accepted_at: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const getLifetimePaceMetrics = (
  promises: PaceMetricInput[],
  nowTimestamp = Date.now()
) => {
  const acceptedTimestamps = promises.flatMap((promise) => {
    if (!promise.accepted_at) return [];

    const acceptedTimestamp = new Date(promise.accepted_at).getTime();
    if (Number.isNaN(acceptedTimestamp)) return [];
    if (acceptedTimestamp > nowTimestamp) return [];

    return [acceptedTimestamp];
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

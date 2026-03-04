export type PaceMetricInput = {
  accepted_at: string | null;
};

export const ROLLING_WINDOW_DAYS = 30;

const WINDOW_MS = ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const getPaceMetricsLast30Days = (
  promises: PaceMetricInput[],
  nowTimestamp = Date.now()
) => {
  const acceptedDates = promises.flatMap((promise) => {
    if (!promise.accepted_at) return [];
    const acceptedTimestamp = new Date(promise.accepted_at).getTime();

    if (Number.isNaN(acceptedTimestamp)) return [];
    if (acceptedTimestamp > nowTimestamp) return [];
    if (nowTimestamp - acceptedTimestamp > WINDOW_MS) return [];

    return [new Date(acceptedTimestamp).toISOString().slice(0, 10)];
  });

  return {
    deals30d: acceptedDates.length,
    activeDays30d: new Set(acceptedDates).size,
  };
};

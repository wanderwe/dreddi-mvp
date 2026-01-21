export type PublicReputationCounts = {
  confirmedCount: number;
  completedCount: number;
  disputedCount: number;
};

export const hasPublicReputationHistory = ({
  confirmedCount,
  completedCount,
  disputedCount,
}: PublicReputationCounts) =>
  confirmedCount > 0 || completedCount > 0 || disputedCount > 0;

export const getPublicReputationScore = ({
  confirmedCount,
  completedCount,
  disputedCount,
}: PublicReputationCounts) => completedCount + confirmedCount * 0.5 - disputedCount * 2;

export const formatPublicReputationScore = (score: number, locale?: string) => {
  const hasFraction = Math.abs(score % 1) > Number.EPSILON;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasFraction ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(score);
};

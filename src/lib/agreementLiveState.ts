import type { PromiseUiStatus } from "@/lib/promiseUiStatus";

const NON_LIVE_AGREEMENT_STATUSES = new Set<string>([
  "confirmed",
  "fulfilled",
  "completed",
  "completed_by_promisor",
  "disputed",
  "declined",
  "rejected",
  "expired",
  "invite_expired",
  "cancelled",
  "canceled",
  "cancelled_by_creator",
  "archived",
  "closed",
  "timed_out",
]);

export const isAgreementLiveStatus = (status: PromiseUiStatus | string | null | undefined) => {
  if (!status) return false;

  return !NON_LIVE_AGREEMENT_STATUSES.has(status);
};

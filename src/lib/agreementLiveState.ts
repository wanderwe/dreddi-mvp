import type { PromiseUiStatus } from "@/lib/promiseUiStatus";

const NON_LIVE_AGREEMENT_STATUSES: ReadonlySet<PromiseUiStatus> = new Set([
  "confirmed",
  "disputed",
  "declined",
  "expired",
  "cancelled_by_creator",
]);

export const isAgreementLiveStatus = (status: PromiseUiStatus) =>
  !NON_LIVE_AGREEMENT_STATUSES.has(status);

export const PROMISE_STATUSES = [
  "active",
  "completed_by_promisor",
  "confirmed",
  "disputed",
  "canceled",
] as const;

export type PromiseStatus = (typeof PROMISE_STATUSES)[number];

export function isPromiseStatus(value: unknown): value is PromiseStatus {
  return typeof value === "string" && PROMISE_STATUSES.includes(value as PromiseStatus);
}

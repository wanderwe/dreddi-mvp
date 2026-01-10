import { PromiseStatus } from "./promiseStatus";

export type PromiseRole = "promisor" | "counterparty";

export type PromiseListItem = {
  status: PromiseStatus;
  role: PromiseRole;
  acceptedBySecondSide: boolean;
};

/**
 * Awaiting your action = promises where the signed-in user has a primary CTA available.
 * - Promisor + active → can mark as completed.
 * - Counterparty + completed_by_promisor → can confirm or dispute.
 *
 * This definition is shared with the overview metrics and list CTAs so the counts
 * match what the UI renders as actionable for the current user.
 */
export function isAwaitingYourAction(row: PromiseListItem): boolean {
  if (row.role === "promisor" && row.status === "active" && row.acceptedBySecondSide) return true;
  if (row.role === "counterparty" && row.status === "completed_by_promisor") return true;
  return false;
}

/**
 * Awaiting others mirrors the CTA logic from the opposite perspective, indicating
 * items where the counterparty owes the next action.
 */
export function isAwaitingOthers(row: PromiseListItem): boolean {
  if (row.role === "promisor" && row.status === "completed_by_promisor") return true;
  if (row.role === "counterparty" && row.status === "active" && row.acceptedBySecondSide) return true;
  return false;
}

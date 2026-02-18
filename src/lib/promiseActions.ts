import { PromiseStatus } from "./promiseStatus";
import { InviteStatus } from "./promiseAcceptance";

export type PromiseRole = "promisor" | "counterparty";

export type PromiseListItem = {
  status: PromiseStatus;
  role: PromiseRole;
  inviteStatus: InviteStatus;
  isReviewer: boolean;
};

const isInviteAccepted = (inviteStatus: InviteStatus) =>
  inviteStatus === "accepted";

/**
 * Awaiting your action = promises where the signed-in user has a primary CTA available.
 * - Counterparty + awaiting_acceptance → can accept/decline invite.
 * - Promisor + active + accepted invite → can mark as completed.
 * - Counterparty reviewer + completed_by_promisor + accepted invite → can confirm or dispute.
 *
 * This definition is shared with the overview metrics, header CTA count, and list CTAs
 * so all surfaces use the same actionable semantics.
 */
export function isAwaitingYourAction(row: PromiseListItem): boolean {
  if (row.isReviewer && row.inviteStatus === "awaiting_acceptance") {
    return true;
  }
  if (row.role === "promisor" && row.status === "active" && isInviteAccepted(row.inviteStatus)) {
    return true;
  }
  if (row.isReviewer && row.status === "completed_by_promisor" && isInviteAccepted(row.inviteStatus)) {
    return true;
  }
  return false;
}

/**
 * Awaiting others mirrors the CTA logic from the opposite perspective, indicating
 * items where the counterparty owes the next action.
 */
export function isAwaitingOthers(row: PromiseListItem): boolean {
  if (row.role === "promisor" && row.status === "completed_by_promisor" && !row.isReviewer) {
    return true;
  }
  if (row.isReviewer && row.role !== "promisor" && row.status === "active" && isInviteAccepted(row.inviteStatus)) {
    return true;
  }
  return false;
}

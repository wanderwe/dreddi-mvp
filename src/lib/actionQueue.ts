import { getPromiseInviteStatus } from "@/lib/promiseAcceptance";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import { PromiseStatus } from "@/lib/promiseStatus";

type ActionQueueBaseRow = {
  id: string;
  status: PromiseStatus;
  due_at: string | null;
  invite_status: string | null;
  counterparty_accepted_at: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  ignored_at: string | null;
  creator_id: string;
  promisor_id: string | null;
  promisee_id: string | null;
  counterparty_id: string | null;
};

export type ActionQueueState =
  | "awaiting_acceptance"
  | "overdue"
  | "active_no_deadline"
  | "needs_confirmation";

export function getActionQueueState(
  row: ActionQueueBaseRow,
  userId: string,
  now = new Date()
): ActionQueueState | null {
  if (row.status === "confirmed" || row.status === "disputed" || row.status === "declined") {
    return null;
  }

  const inviteStatus = getPromiseInviteStatus(row);
  const isInviteAccepted = inviteStatus === "accepted";

  if (inviteStatus === "declined" || inviteStatus === "ignored") {
    return null;
  }

  const executorId = resolveExecutorId(row);
  const isExecutor = executorId === userId;
  const isInvitee = row.counterparty_id === userId || row.promisee_id === userId;

  if (inviteStatus === "awaiting_acceptance" && isInvitee) {
    return "awaiting_acceptance";
  }

  if (row.status === "active" && isExecutor && isInviteAccepted) {
    if (!row.due_at) return "active_no_deadline";
    if (new Date(row.due_at).getTime() <= now.getTime()) return "overdue";
  }

  if (row.status === "completed_by_promisor" && !isExecutor && isInviteAccepted) {
    return "needs_confirmation";
  }

  return null;
}

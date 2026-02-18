import { isPromiseAccepted, PromiseAcceptance } from "@/lib/promiseAcceptance";
import { PromiseStatus } from "@/lib/promiseStatus";
import { PromiseParticipants, resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";

type PromiseForNextAction = PromiseAcceptance &
  PromiseParticipants & {
    status: PromiseStatus;
  };

export type NextActionOwner = "me" | "other" | "none";

export function resolveNextActionOwnerId(promise: PromiseForNextAction): string | null {
  if (!isPromiseAccepted(promise)) return null;

  const executorId = resolveExecutorId(promise);
  const counterpartyId = resolveCounterpartyId(promise);
  if (!executorId || !counterpartyId || executorId === counterpartyId) return null;

  if (promise.status === "active") return executorId;
  if (promise.status === "completed_by_promisor") return counterpartyId;

  return null;
}

export function getNextActionOwner(
  promise: PromiseForNextAction,
  currentUserId: string | null | undefined
): NextActionOwner {
  const nextActionOwnerId = resolveNextActionOwnerId(promise);
  if (!nextActionOwnerId || !currentUserId) return "none";
  return nextActionOwnerId === currentUserId ? "me" : "other";
}

export function canSendReminder(
  promise: PromiseForNextAction,
  currentUserId: string | null | undefined
): boolean {
  return getNextActionOwner(promise, currentUserId) === "other";
}

import { resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";
import { isPromiseAccepted, PromiseAcceptance } from "@/lib/promiseAcceptance";
import type { NotificationRole, NotificationType } from "@/lib/notifications/types";

export type NotificationEvent =
  | "accepted"
  | "marked_completed"
  | "confirmed"
  | "disputed"
  | "reminder_due_24h"
  | "reminder_overdue";

export type PromiseNotificationContext = PromiseAcceptance & {
  id: string;
  creator_id: string;
  promisor_id: string | null;
  promisee_id: string | null;
  counterparty_id: string | null;
};

export type NotificationRecipient = {
  userId: string;
  role?: NotificationRole;
};

const resolveRole = (
  promise: PromiseNotificationContext,
  userId: string
): NotificationRole | undefined => {
  if (userId === promise.creator_id) return "creator";
  const executorId = resolveExecutorId(promise);
  if (executorId && userId === executorId) return "executor";
  return undefined;
};

const addRecipient = (
  promise: PromiseNotificationContext,
  userId: string | null,
  actorId?: string | null
) => {
  if (!userId) return [] as NotificationRecipient[];
  if (actorId && userId === actorId) return [] as NotificationRecipient[];
  return [{ userId, role: resolveRole(promise, userId) }];
};

export const getNotificationRecipients = (
  event: NotificationEvent,
  promise: PromiseNotificationContext,
  actorId?: string | null
): NotificationRecipient[] => {
  if (event !== "accepted" && !isPromiseAccepted(promise)) {
    return [];
  }

  const executorId = resolveExecutorId(promise);
  const counterpartyId = resolveCounterpartyId(promise);

  switch (event) {
    case "accepted":
      return addRecipient(promise, promise.creator_id, actorId);
    case "marked_completed":
      return addRecipient(promise, counterpartyId, actorId);
    case "confirmed":
    case "disputed":
      return addRecipient(promise, executorId, actorId);
    case "reminder_due_24h":
    case "reminder_overdue":
      return addRecipient(promise, executorId, actorId);
    default:
      return [];
  }
};

export const getNotificationDedupeKey = (event: NotificationEvent, promiseId: string) => {
  switch (event) {
    case "accepted":
      return `accepted:${promiseId}`;
    case "marked_completed":
      return `marked_completed:${promiseId}`;
    case "confirmed":
      return `confirmed:${promiseId}`;
    case "disputed":
      return `disputed:${promiseId}`;
    case "reminder_due_24h":
      return `reminder_due_24h:${promiseId}`;
    case "reminder_overdue":
      return `reminder_overdue:${promiseId}`;
    default:
      return `event:${promiseId}`;
  }
};

export const mapEventToNotificationType = (event: NotificationEvent): NotificationType => {
  switch (event) {
    case "accepted":
      return "accepted";
    case "marked_completed":
      return "marked_completed";
    case "confirmed":
      return "confirmed";
    case "disputed":
      return "disputed";
    case "reminder_due_24h":
      return "reminder_due_24h";
    case "reminder_overdue":
      return "reminder_overdue";
    default:
      return "accepted";
  }
};

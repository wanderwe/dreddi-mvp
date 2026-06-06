import { resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";
import { isPromiseAccepted, PromiseAcceptance } from "@/lib/promiseAcceptance";
import type { NotificationRole, NotificationType } from "@/lib/notifications/types";

export type NotificationEvent =
  | "accepted"
  | "marked_completed"
  | "confirmed"
  | "disputed"
  | "reminder_due_24h"
  | "deadline_passed"
  | "counter_condition_proposed"
  | "counter_condition_confirmed"
  | "counter_condition_rejected";

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
  const counterpartyId = resolveCounterpartyId(promise);

  // counter-condition events fire before the deal is accepted — handle them first
  switch (event) {
    case "counter_condition_proposed":
      return addRecipient(promise, promise.creator_id, actorId);
    case "counter_condition_confirmed":
    case "counter_condition_rejected":
      return addRecipient(promise, counterpartyId, actorId);
  }

  if (event !== "accepted" && !isPromiseAccepted(promise)) {
    return [];
  }

  const executorId = resolveExecutorId(promise);

  switch (event) {
    case "accepted":
      return addRecipient(promise, promise.creator_id, actorId);
    case "marked_completed":
      return addRecipient(promise, counterpartyId, actorId);
    case "confirmed":
    case "disputed":
      return addRecipient(promise, executorId, actorId);
    case "reminder_due_24h":
    case "deadline_passed":
      return addRecipient(promise, executorId, actorId);
    default:
      return [];
  }
};

export const getNotificationDedupeKey = (
  event: NotificationEvent,
  promiseId: string,
  recipientUserId: string
) => {
  switch (event) {
    case "accepted":
      return `accepted:${promiseId}:${recipientUserId}`;
    case "marked_completed":
      return `marked_completed:${promiseId}:${recipientUserId}`;
    case "confirmed":
      return `confirmed:${promiseId}:${recipientUserId}`;
    case "disputed":
      return `disputed:${promiseId}:${recipientUserId}`;
    case "reminder_due_24h":
      return `reminder_due_soon:${promiseId}:${recipientUserId}`;
    case "deadline_passed":
      return `reminder_overdue:${promiseId}:${recipientUserId}`;
    case "counter_condition_proposed":
      return `counter_condition_proposed:${promiseId}:${recipientUserId}`;
    case "counter_condition_confirmed":
      return `counter_condition_confirmed:${promiseId}:${recipientUserId}`;
    case "counter_condition_rejected":
      return `counter_condition_rejected:${promiseId}:${recipientUserId}`;
    default:
      return `event:${promiseId}:${recipientUserId}`;
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
    case "deadline_passed":
      return "deadline_passed";
    case "counter_condition_proposed":
      return "counter_condition_proposed";
    case "counter_condition_confirmed":
      return "counter_condition_confirmed";
    case "counter_condition_rejected":
      return "counter_condition_rejected";
    default:
      return "accepted";
  }
};

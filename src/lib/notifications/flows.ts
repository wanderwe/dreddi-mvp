import type { NotificationRequest } from "./service";
import type { NotificationType } from "./types";

type InviteAcceptedInput = {
  id: string;
  creator_id: string;
  promisor_id: string | null;
  promisee_id: string | null;
  counterparty_id: string | null;
};

export function buildInviteAcceptedNotifications(
  promise: InviteAcceptedInput
): NotificationRequest[] {
  const results: NotificationRequest[] = [];

  const executorId = promise.promisor_id ?? promise.counterparty_id;
  if (executorId) {
    results.push({
      userId: executorId,
      promiseId: promise.id,
      type: "invite_followup",
      role: "executor",
      dedupeKey: `invite_accepted_executor:${promise.id}`,
      ctaUrl: `/promises/${promise.id}`,
      priority: "normal",
    });
  }

  results.push({
    userId: promise.creator_id,
    promiseId: promise.id,
    type: "accepted",
    role: "creator",
    dedupeKey: `invite_accepted_creator:${promise.id}`,
    ctaUrl: `/promises/${promise.id}`,
    priority: "normal",
  });

  return results;
}

type CompletionWaitingInput = {
  promiseId: string;
  creatorId: string;
  cycleId: number;
};

export function buildCompletionWaitingNotification(
  input: CompletionWaitingInput
): NotificationRequest {
  return {
    userId: input.creatorId,
    promiseId: input.promiseId,
    type: "completion_waiting",
    role: "creator",
    dedupeKey: `completion_waiting:${input.promiseId}:${input.cycleId}:initial`,
    ctaUrl: `/promises/${input.promiseId}/confirm`,
    priority: "normal",
  };
}

type CompletionOutcomeInput = {
  promiseId: string;
  executorId: string;
  type: NotificationType;
  delta?: number | null;
};

export function buildCompletionOutcomeNotification(
  input: CompletionOutcomeInput
): NotificationRequest {
  return {
    userId: input.executorId,
    promiseId: input.promiseId,
    type: input.type,
    role: "executor",
    dedupeKey: `${input.type}:${input.promiseId}`,
    ctaUrl: `/promises/${input.promiseId}`,
    priority: "normal",
    delta: input.delta,
  };
}

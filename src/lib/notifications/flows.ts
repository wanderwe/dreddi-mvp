import { resolveExecutorId } from "@/lib/promiseParticipants";
import {
  buildCtaUrl,
  buildDedupeKey,
  mapPriorityForType,
} from "@/lib/notifications/service";
import type { NotificationRequest } from "@/lib/notifications/service";
import type { NotificationType } from "@/lib/notifications/types";

type PromiseParticipants = {
  id: string;
  creator_id: string;
  promisor_id: string | null;
  promisee_id: string | null;
  counterparty_id: string | null;
};

export const buildInviteAcceptedNotifications = (
  promise: PromiseParticipants
): NotificationRequest[] => {
  const notifications: NotificationRequest[] = [];
  const executorId = resolveExecutorId(promise);

  if (executorId) {
    notifications.push({
      userId: executorId,
      promiseId: promise.id,
      type: "invite_followup",
      role: "executor",
      dedupeKey: buildDedupeKey(["invite_followup", promise.id, "executor"]),
      ctaUrl: buildCtaUrl(promise.id),
      priority: mapPriorityForType("invite_followup"),
    });
  }

  notifications.push({
    userId: promise.creator_id,
    promiseId: promise.id,
    type: "invite_followup",
    role: "creator",
    dedupeKey: buildDedupeKey(["invite_followup", promise.id, "creator"]),
    ctaUrl: buildCtaUrl(promise.id),
    priority: mapPriorityForType("invite_followup"),
  });

  return notifications;
};

export const buildCompletionWaitingNotification = (args: {
  promiseId: string;
  creatorId: string;
  cycleId: number;
}): NotificationRequest => ({
  userId: args.creatorId,
  promiseId: args.promiseId,
  type: "completion_waiting",
  role: "creator",
  dedupeKey: buildDedupeKey(["completion_waiting", args.promiseId, args.cycleId, "initial"]),
  ctaUrl: `/promises/${args.promiseId}/confirm`,
  priority: mapPriorityForType("completion_waiting"),
});

export const buildCompletionOutcomeNotification = (args: {
  promiseId: string;
  executorId: string;
  type: Extract<NotificationType, "completion_followup" | "dispute">;
  delta?: number | null;
}): NotificationRequest => ({
  userId: args.executorId,
  promiseId: args.promiseId,
  type: args.type,
  role: "executor",
  dedupeKey: buildDedupeKey([args.type, args.promiseId]),
  ctaUrl: `/promises/${args.promiseId}`,
  priority: mapPriorityForType(args.type),
  delta: args.delta ?? null,
});

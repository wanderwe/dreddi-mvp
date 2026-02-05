import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getNotificationDedupeKey,
  getNotificationRecipients,
  mapEventToNotificationType,
  NotificationEvent,
  PromiseNotificationContext,
} from "@/lib/notifications/recipients";
import {
  buildCtaUrl,
  createNotification,
  mapPriorityForType,
} from "@/lib/notifications/service";

type DispatchOptions = {
  admin: SupabaseClient;
  event: NotificationEvent;
  promise: PromiseNotificationContext;
  actorId?: string | null;
  ctaUrl?: string;
  delta?: number | null;
  requiresDeadlineReminder?: boolean;
};

export const dispatchNotificationEvent = async (options: DispatchOptions) => {
  const {
    admin,
    event,
    promise,
    actorId,
    ctaUrl = buildCtaUrl(promise.id),
    delta,
    requiresDeadlineReminder,
  } = options;

  const recipients = getNotificationRecipients(event, promise, actorId);
  if (recipients.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[notifications] event_dispatch_skipped", {
        event,
        promiseId: promise.id,
        actorId: actorId ?? null,
        reason: "no_recipients",
      });
    }
    return [];
  }

  const dedupeKey = getNotificationDedupeKey(event, promise.id);
  const type = mapEventToNotificationType(event);

  const results = [];

  for (const recipient of recipients) {
    const outcome = await createNotification(admin, {
      userId: recipient.userId,
      promiseId: promise.id,
      type,
      role: recipient.role,
      dedupeKey,
      ctaUrl,
      priority: mapPriorityForType(type),
      delta: delta ?? null,
      requiresDeadlineReminder,
    });
    results.push({ userId: recipient.userId, outcome });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[notifications] event_dispatch", {
      event,
      promiseId: promise.id,
      actorId: actorId ?? null,
      recipients: recipients.map((recipient) => recipient.userId),
      dedupeKey,
      type,
      results: results.map((result) => ({
        userId: result.userId,
        created: result.outcome.created,
        skippedReason: result.outcome.skippedReason ?? null,
      })),
    });
  }

  return results;
};

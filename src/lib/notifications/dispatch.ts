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
  title?: string;
  body?: string;
  ctaLabel?: string | null;
  dedupeKeyOverride?: string;
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
    title,
    body,
    ctaLabel,
    dedupeKeyOverride,
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

  const type = mapEventToNotificationType(event);

  const results = [];

  for (const recipient of recipients) {
    const dedupeKey =
      dedupeKeyOverride ?? getNotificationDedupeKey(event, promise.id, recipient.userId);
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
      title,
      body,
      ctaLabel,
    });
    results.push({ userId: recipient.userId, outcome });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[notifications] event_dispatch", {
      event,
      promiseId: promise.id,
      actorId: actorId ?? null,
      recipients: recipients.map((recipient) => recipient.userId),
      dedupeKeys: results.map((result) => dedupeKeyOverride ?? getNotificationDedupeKey(event, promise.id, result.userId)),
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

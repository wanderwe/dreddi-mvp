export const NOTIFICATION_COUNT_EVENT = "notifications:count-delta";

type NotificationCountDeltaDetail = {
  delta: number;
};

export const emitNotificationCountDelta = (delta: number) => {
  if (typeof window === "undefined" || delta === 0) return;
  window.dispatchEvent(
    new CustomEvent<NotificationCountDeltaDetail>(NOTIFICATION_COUNT_EVENT, {
      detail: { delta },
    })
  );
};

export const isNotificationCountEvent = (
  event: Event
): event is CustomEvent<NotificationCountDeltaDetail> => event instanceof CustomEvent;

// Broadcasts the absolute unread count so other components (e.g. mobile menu)
// can display it without making their own API calls.
export const NOTIFICATION_COUNT_SYNC_EVENT = "notifications:count-sync";

export const emitNotificationCountSync = (count: number) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ count: number }>(NOTIFICATION_COUNT_SYNC_EVENT, { detail: { count } })
  );
};

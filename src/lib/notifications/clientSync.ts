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

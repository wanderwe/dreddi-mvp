import { NotificationType, NotificationTypeInput, normalizeNotificationType } from "./types";

export const DAILY_NOTIFICATION_CAP = 3;

export const CRITICAL_NOTIFICATION_TYPES: NotificationType[] = [
  "completion_waiting",
  "completion_followup",
  "dispute",
];

const parseTimeToMinutes = (value: string) => {
  const [h, m] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

export const isWithinQuietHours = (
  now: Date,
  { enabled, start, end }: { enabled: boolean; start: string; end: string }
) => {
  if (!enabled) return false;
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
};

export const isDailyCapExceeded = (count: number, type: NotificationTypeInput) => {
  if (CRITICAL_NOTIFICATION_TYPES.includes(normalizeNotificationType(type))) return false;
  return count >= DAILY_NOTIFICATION_CAP;
};

export const isPerDealCapExceeded = (
  lastSentAt: Date | null,
  now: Date,
  type: NotificationTypeInput
) => {
  if (CRITICAL_NOTIFICATION_TYPES.includes(normalizeNotificationType(type))) return false;
  if (!lastSentAt) return false;
  return now.getTime() - lastSentAt.getTime() < 24 * 60 * 60 * 1000;
};

export const getCompletionFollowupStage = (
  completionNotifiedAt: Date | null,
  followupsCount: number,
  now: Date
) => {
  if (!completionNotifiedAt) return null;
  const hoursSince = (now.getTime() - completionNotifiedAt.getTime()) / (1000 * 60 * 60);

  if (followupsCount === 0 && hoursSince >= 24) return "24h";
  if (followupsCount === 1 && hoursSince >= 72) return "72h";
  return null;
};

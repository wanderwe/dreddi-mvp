import { NotificationType, normalizeNotificationType } from "./types";

export const DAILY_NOTIFICATION_CAP = 3;

export const CRITICAL_NOTIFICATION_TYPES: NotificationType[] = [
  "marked_completed",
  "completion_waiting",
  "completion_followup",
  "dispute",
  "disputed",
];

export const CAP_BYPASS_NOTIFICATION_TYPES: NotificationType[] = [
  ...CRITICAL_NOTIFICATION_TYPES,
  "accepted",
  "invite",
  "invite_followup",
  "overdue",
  "due_soon",
  "reminder_overdue",
  "deadline_passed",
  "manual_reminder",
  "reminder_manual",
  "reminder_due_24h",
  "reminder_deadline",
  "invite_declined",
  "invite_ignored",
];

export const PER_DEAL_CAP_BYPASS_NOTIFICATION_TYPES: NotificationType[] = [
  ...CRITICAL_NOTIFICATION_TYPES,
  "accepted",
  "invite_followup",
  "overdue",
  "due_soon",
  "reminder_overdue",
  "deadline_passed",
  "manual_reminder",
  "reminder_manual",
  "reminder_due_24h",
  "reminder_deadline",
  "invite_declined",
  "invite_ignored",
];


export const isDailyCapExceeded = (count: number, type: NotificationType) => {
  if (CAP_BYPASS_NOTIFICATION_TYPES.includes(normalizeNotificationType(type))) return false;
  return count >= DAILY_NOTIFICATION_CAP;
};

export const isPerDealCapExceeded = (lastSentAt: Date | null, now: Date, type: NotificationType) => {
  if (PER_DEAL_CAP_BYPASS_NOTIFICATION_TYPES.includes(normalizeNotificationType(type))) {
    return false;
  }
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

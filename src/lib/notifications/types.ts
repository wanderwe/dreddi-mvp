export type NotificationType =
  | "accepted"
  | "invite"
  | "invite_followup"
  | "invite_declined"
  | "invite_ignored"
  | "marked_completed"
  | "confirmed"
  | "disputed"
  | "reminder_due_24h"
  | "deadline_passed"
  | "manual_reminder"
  | "reminder_overdue"
  | "due_soon"
  | "overdue"
  | "completion_waiting"
  | "completion_followup"
  | "dispute";

export const normalizeNotificationType = (type: NotificationType): NotificationType => type;

export type NotificationPriority = "low" | "normal" | "high" | "critical";

export type NotificationLocale = "en" | "uk";

export type NotificationRole = "creator" | "executor" | "counterparty";

export type NotificationSettings = {
  locale: NotificationLocale;
  pushEnabled: boolean;
  emailEnabled: boolean;
  deadlineRemindersEnabled: boolean;
};

export type NotificationCopy = {
  title: string;
  body: string;
  ctaLabel: string;
};

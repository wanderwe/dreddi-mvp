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
  | "reminder_deadline"
  | "reminder_manual"
  | "reminder_overdue"
  | "reminder_manual"
  | "due_soon"
  | "overdue"
  | "completion_waiting"
  | "completion_followup"
  | "dispute";

export const normalizeNotificationType = (type: NotificationType): NotificationType => {
  if (type === "manual_reminder") return "reminder_manual";
  if (type === "deadline_passed" || type === "reminder_due_24h" || type === "reminder_overdue") {
    return "reminder_deadline";
  }
  return type;
};

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

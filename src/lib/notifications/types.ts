export type NotificationType =
  | "accepted"
  | "invite"
  | "invite_followup"
  | "invite_declined"
  | "invite_ignored"
  | "invite_withdrawn"
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
  | "dispute"
  | "public_agreement_accepted"
  | "public_agreement_completed"
  | "public_agreement_fulfilled"
  | "public_agreement_disputed"
  | "public_agreement_updated"
  | "public_agreement_deadline"
  | "agreement_updated"
  | "counter_condition_proposed"
  | "counter_condition_confirmed"
  | "counter_condition_rejected"
  | "admin_new_feedback";

export const normalizeNotificationType = (type: NotificationType): NotificationType => {
  if (type === "manual_reminder") return "reminder_manual";
  if (type === "reminder_deadline") return "deadline_passed";
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

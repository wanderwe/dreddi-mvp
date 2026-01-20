export type NotificationType =
  | "invite"
  | "invite_followup"
  | "invite_declined"
  | "invite_ignored"
  | "due_soon"
  | "overdue"
  | "completion_waiting"
  | "completion_followup"
  | "dispute";

export const normalizeNotificationType = (type: NotificationType): NotificationType => type;

export type NotificationPriority = "low" | "normal" | "high" | "critical";

export type NotificationLocale = "en" | "uk";

export type NotificationRole = "creator" | "executor";

export type NotificationSettings = {
  locale: NotificationLocale;
  pushEnabled: boolean;
  deadlineRemindersEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export type NotificationCopy = {
  title: string;
  body: string;
  ctaLabel: string;
};

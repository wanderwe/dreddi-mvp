export type NotificationType = "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | "N7";

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

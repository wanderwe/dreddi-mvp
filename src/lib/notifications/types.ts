export type LegacyNotificationType = "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | "N7";

export type NotificationType =
  | "invite"
  | "invite_followup"
  | "due_soon"
  | "overdue"
  | "completion_waiting"
  | "completion_followup"
  | "dispute";

export type NotificationTypeInput = NotificationType | LegacyNotificationType;

export const LEGACY_NOTIFICATION_TYPE_MAP = {
  N1: "invite",
  N2: "invite_followup",
  N3: "due_soon",
  N4: "overdue",
  N5: "completion_waiting",
  N6: "completion_followup",
  N7: "dispute",
} as const satisfies Record<LegacyNotificationType, NotificationType>;

const isLegacyNotificationType = (type: NotificationTypeInput): type is LegacyNotificationType =>
  Object.prototype.hasOwnProperty.call(LEGACY_NOTIFICATION_TYPE_MAP, type);

export const normalizeNotificationType = (type: NotificationTypeInput): NotificationType => {
  if (isLegacyNotificationType(type)) {
    return LEGACY_NOTIFICATION_TYPE_MAP[type];
  }

  return type;
};

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

const NOTIFICATION_TYPE_CONSTRAINT_NAME = "notifications_type_valid";

export function isNotificationTypeConstraintError(detail?: string): boolean {
  if (!detail) return false;

  return detail.includes("relation \"notifications\"") && detail.includes(NOTIFICATION_TYPE_CONSTRAINT_NAME);
}

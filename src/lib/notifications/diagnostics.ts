export type NotificationResolutionContext = {
  promiseId: string;
  creatorId: string;
  promisorId: string | null;
  promiseeId: string | null;
  counterpartyId: string | null;
  flowName: string;
};

export type NotificationRecipientRole = "executor" | "counterparty";

export function logMissingNotificationRecipient(
  context: NotificationResolutionContext & { recipientRole: NotificationRecipientRole }
) {
  console.warn("[notifications] recipient_unresolved", context);
}

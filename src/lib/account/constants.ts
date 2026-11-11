// Shared by the server routes and the client: how long a deletion request waits, and the tombstone
// account that takes the deleted side in deals with other people.
export const ACCOUNT_DELETION_GRACE_DAYS = 30;

export const DELETED_ACCOUNT_ID = "00000000-0000-4000-a000-00000000dead";

export const isDeletedAccountId = (id?: string | null) => id === DELETED_ACCOUNT_ID;

export const accountDeletesAt = (deletedAt: string | Date) =>
  new Date(new Date(deletedAt).getTime() + ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);

export const ACTIVE_DEAL_STATUSES = ["active", "completed_by_promisor", "disputed"] as const;

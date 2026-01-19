export const INVITE_STATUSES = [
  "awaiting_acceptance",
  "accepted",
  "declined",
  "ignored",
] as const;

export type InviteStatus = (typeof INVITE_STATUSES)[number];

export type PromiseAcceptance = {
  invite_status?: string | null;
  invited_at?: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
  ignored_at?: string | null;
  counterparty_accepted_at?: string | null;
};

export const isInviteStatus = (value: unknown): value is InviteStatus =>
  typeof value === "string" && INVITE_STATUSES.includes(value as InviteStatus);

export const getPromiseInviteStatus = (
  row: PromiseAcceptance | null | undefined
): InviteStatus => {
  if (!row) return "awaiting_acceptance";

  if (isInviteStatus(row.invite_status)) return row.invite_status;
  if (row.accepted_at || row.counterparty_accepted_at) return "accepted";
  if (row.declined_at) return "declined";
  if (row.ignored_at) return "ignored";

  return "awaiting_acceptance";
};

export const isPromiseAccepted = (row: PromiseAcceptance | null | undefined) =>
  getPromiseInviteStatus(row) === "accepted";

export const canCounterpartyRespond = (args: {
  userId: string | null;
  creatorId: string;
  counterpartyId: string | null;
  inviteStatus: InviteStatus;
}) => {
  const { userId, creatorId, counterpartyId, inviteStatus } = args;

  if (!creatorId) return false;
  if (!userId) return false;
  if (userId === creatorId) return false;
  if (inviteStatus !== "awaiting_acceptance") return false;
  if (!counterpartyId || counterpartyId !== userId) return false;

  return true;
};

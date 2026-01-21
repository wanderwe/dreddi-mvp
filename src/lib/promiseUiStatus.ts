import { getPromiseInviteStatus, InviteStatus, PromiseAcceptance } from "./promiseAcceptance";
import { PromiseStatus } from "./promiseStatus";

export type PromiseUiStatus = PromiseStatus | Exclude<InviteStatus, "accepted">;

type PromiseUiStatusInput = PromiseAcceptance & { status: PromiseStatus };

export const getPromiseUiStatus = (
  row: PromiseUiStatusInput | null | undefined
): PromiseUiStatus => {
  if (!row) return "awaiting_acceptance";

  if (row.status !== "active") return row.status;

  const inviteStatus = getPromiseInviteStatus(row);
  if (inviteStatus !== "accepted") return inviteStatus;

  return row.status;
};

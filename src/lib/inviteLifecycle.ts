import { InviteStatus } from "@/lib/promiseAcceptance";

export const PRIVATE_INVITE_TTL_DAYS = 7;
export const PUBLIC_INVITE_TTL_DAYS = 180;
export const INVITE_TTL_DAYS = PRIVATE_INVITE_TTL_DAYS;
export const INVITE_TTL_HOURS = INVITE_TTL_DAYS * 24;
export const PUBLIC_INVITE_TTL_HOURS = PUBLIC_INVITE_TTL_DAYS * 24;

type InviteExpiryOptions = { visibility?: "private" | "public" | null };

export const getInviteTtlHours = (visibility: InviteExpiryOptions["visibility"] = "private") =>
  visibility === "public" ? PUBLIC_INVITE_TTL_HOURS : INVITE_TTL_HOURS;

export const getInviteExpiryIso = (from = new Date(), options: InviteExpiryOptions = {}) =>
  new Date(from.getTime() + getInviteTtlHours(options.visibility) * 60 * 60 * 1000).toISOString();

export const isTerminalInviteStatus = (status: string | null | undefined) =>
  status === "accepted" ||
  status === "declined" ||
  status === "expired" ||
  status === "cancelled_by_creator";

export const canCreatorWithdrawInvite = (status: InviteStatus) => status === "awaiting_acceptance";

export const hasInviteExpired = (expiresAt: string | null | undefined, now = new Date()) => {
  if (!expiresAt) return false;
  const expiresAtTime = new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtTime) && expiresAtTime <= now.getTime();
};

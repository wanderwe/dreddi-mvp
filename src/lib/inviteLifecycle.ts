import { InviteStatus } from "@/lib/promiseAcceptance";

export const INVITE_TTL_HOURS = 72;

export const getInviteExpiryIso = (from = new Date()) =>
  new Date(from.getTime() + INVITE_TTL_HOURS * 60 * 60 * 1000).toISOString();

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

import assert from "node:assert/strict";
import test from "node:test";

import {
  canCreatorWithdrawInvite,
  getInviteExpiryIso,
  hasInviteExpired,
  isTerminalInviteStatus,
} from "../src/lib/inviteLifecycle";

test("creator can withdraw only while awaiting acceptance", () => {
  assert.equal(canCreatorWithdrawInvite("awaiting_acceptance"), true);
  assert.equal(canCreatorWithdrawInvite("accepted"), false);
  assert.equal(canCreatorWithdrawInvite("declined"), false);
  assert.equal(canCreatorWithdrawInvite("expired"), false);
  assert.equal(canCreatorWithdrawInvite("cancelled_by_creator"), false);
});

test("expiry helper marks invites expired once threshold is passed", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const expiresAt = getInviteExpiryIso(createdAt);

  assert.equal(hasInviteExpired(expiresAt, new Date("2026-01-03T23:59:59.000Z")), false);
  assert.equal(hasInviteExpired(expiresAt, new Date("2026-01-04T00:00:00.000Z")), true);
});

test("terminal invite statuses block later acceptance", () => {
  assert.equal(isTerminalInviteStatus("accepted"), true);
  assert.equal(isTerminalInviteStatus("declined"), true);
  assert.equal(isTerminalInviteStatus("expired"), true);
  assert.equal(isTerminalInviteStatus("cancelled_by_creator"), true);
  assert.equal(isTerminalInviteStatus("awaiting_acceptance"), false);
});

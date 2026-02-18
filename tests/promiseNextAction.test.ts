import assert from "node:assert/strict";
import test from "node:test";

import {
  canSendReminder,
  getNextActionOwner,
  resolveNextActionOwnerId,
} from "../src/lib/promiseNextAction";

const acceptedBase = {
  creator_id: "creator",
  promisor_id: "executor",
  promisee_id: "reviewer",
  counterparty_id: "reviewer",
  invite_status: "accepted",
  invited_at: "2026-01-01T00:00:00.000Z",
  accepted_at: "2026-01-01T00:01:00.000Z",
  declined_at: null,
  ignored_at: null,
} as const;

test("active deal waits for executor", () => {
  const promise = { ...acceptedBase, status: "active" } as const;

  assert.equal(resolveNextActionOwnerId(promise), "executor");
  assert.equal(getNextActionOwner(promise, "executor"), "me");
  assert.equal(getNextActionOwner(promise, "reviewer"), "other");
  assert.equal(canSendReminder(promise, "reviewer"), true);
  assert.equal(canSendReminder(promise, "executor"), false);
});

test("completed_by_promisor waits for reviewer", () => {
  const promise = { ...acceptedBase, status: "completed_by_promisor" } as const;

  assert.equal(resolveNextActionOwnerId(promise), "reviewer");
  assert.equal(getNextActionOwner(promise, "reviewer"), "me");
  assert.equal(getNextActionOwner(promise, "executor"), "other");
  assert.equal(canSendReminder(promise, "executor"), true);
  assert.equal(canSendReminder(promise, "reviewer"), false);
});

test("reminder is unavailable for not accepted or terminal states", () => {
  const pendingInvite = { ...acceptedBase, status: "active", invite_status: "awaiting_acceptance" } as const;
  assert.equal(resolveNextActionOwnerId(pendingInvite), null);
  assert.equal(getNextActionOwner(pendingInvite, "creator"), "none");
  assert.equal(canSendReminder(pendingInvite, "creator"), false);

  const terminal = { ...acceptedBase, status: "confirmed" } as const;
  assert.equal(resolveNextActionOwnerId(terminal), null);
  assert.equal(getNextActionOwner(terminal, "executor"), "none");
  assert.equal(canSendReminder(terminal, "executor"), false);
});

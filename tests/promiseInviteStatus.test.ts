import assert from "node:assert/strict";
import test from "node:test";

import {
  canCounterpartyRespond,
  getPromiseInviteStatus,
  InviteStatus,
} from "../src/lib/promiseAcceptance";

test("getPromiseInviteStatus prefers explicit invite_status", () => {
  const status = getPromiseInviteStatus({
    invite_status: "declined",
    accepted_at: "2024-01-01T00:00:00Z",
  });

  assert.equal(status, "declined");
});

test("getPromiseInviteStatus falls back to accepted timestamps", () => {
  const status = getPromiseInviteStatus({
    invite_status: null,
    accepted_at: null,
    counterparty_accepted_at: "2024-01-01T00:00:00Z",
  });

  assert.equal(status, "accepted");
});

test("canCounterpartyRespond requires awaiting acceptance and matching counterparty", () => {
  const base = {
    creatorId: "creator",
    counterpartyId: "counterparty",
    inviteStatus: "awaiting_acceptance" as InviteStatus,
  };

  assert.equal(
    canCounterpartyRespond({ ...base, userId: "creator" }),
    false
  );
  assert.equal(
    canCounterpartyRespond({ ...base, userId: "counterparty" }),
    true
  );
});

test("canCounterpartyRespond blocks mismatched counterparty", () => {
  const canRespond = canCounterpartyRespond({
    userId: "other",
    creatorId: "creator",
    counterpartyId: "counterparty",
    inviteStatus: "awaiting_acceptance",
  });

  assert.equal(canRespond, false);
});

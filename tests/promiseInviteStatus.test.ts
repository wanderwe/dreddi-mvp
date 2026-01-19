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

test("canCounterpartyRespond allows pending invitee when counterparty is unset", () => {
  const canRespond = canCounterpartyRespond({
    userId: "invitee",
    creatorId: "creator",
    counterpartyId: null,
    inviteStatus: "awaiting_acceptance",
  });

  assert.equal(canRespond, true);
});

test("canCounterpartyRespond blocks creator even when pending", () => {
  const canRespond = canCounterpartyRespond({
    userId: "creator",
    creatorId: "creator",
    counterpartyId: null,
    inviteStatus: "awaiting_acceptance",
  });

  assert.equal(canRespond, false);
});

test("canCounterpartyRespond blocks decline after acceptance/decline", () => {
  const base = {
    userId: "invitee",
    creatorId: "creator",
    counterpartyId: "invitee",
  };

  assert.equal(
    canCounterpartyRespond({ ...base, inviteStatus: "accepted" }),
    false
  );
  assert.equal(
    canCounterpartyRespond({ ...base, inviteStatus: "declined" }),
    false
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

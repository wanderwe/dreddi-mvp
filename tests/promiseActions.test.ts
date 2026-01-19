import assert from "node:assert/strict";
import test from "node:test";

import { isAwaitingOthers, isAwaitingYourAction, PromiseRole } from "../src/lib/promiseActions";
import { PromiseStatus } from "../src/lib/promiseStatus";
import { InviteStatus } from "../src/lib/promiseAcceptance";

type FixtureRow = {
  role: PromiseRole;
  status: PromiseStatus;
  inviteStatus: InviteStatus;
};

test("promisor with an active accepted promise should be awaiting your action", () => {
  const row: FixtureRow = { role: "promisor", status: "active", inviteStatus: "accepted" };

  assert.equal(isAwaitingYourAction(row), true);
  assert.equal(isAwaitingOthers(row), false);
});

test("promisor with an awaiting invite is not awaiting your action", () => {
  const row: FixtureRow = {
    role: "promisor",
    status: "active",
    inviteStatus: "awaiting_acceptance",
  };

  assert.equal(isAwaitingYourAction(row), false);
  assert.equal(isAwaitingOthers(row), false);
});

test("counterparty should be awaiting action after promisor marks complete", () => {
  const row: FixtureRow = {
    role: "counterparty",
    status: "completed_by_promisor",
    inviteStatus: "accepted",
  };

  assert.equal(isAwaitingYourAction(row), true);
  assert.equal(isAwaitingOthers(row), false);
});

test("awaiting others mirrors CTA responsibility", () => {
  const row: FixtureRow = {
    role: "promisor",
    status: "completed_by_promisor",
    inviteStatus: "accepted",
  };

  assert.equal(isAwaitingYourAction(row), false);
  assert.equal(isAwaitingOthers(row), true);
});

test("counterparty with an active accepted promise is awaiting the promisor", () => {
  const row: FixtureRow = { role: "counterparty", status: "active", inviteStatus: "accepted" };

  assert.equal(isAwaitingYourAction(row), false);
  assert.equal(isAwaitingOthers(row), true);
});

test("counterparty with a declined invite is not awaiting the promisor", () => {
  const row: FixtureRow = { role: "counterparty", status: "active", inviteStatus: "declined" };

  assert.equal(isAwaitingYourAction(row), false);
  assert.equal(isAwaitingOthers(row), false);
});

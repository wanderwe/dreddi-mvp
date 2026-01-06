import assert from "node:assert/strict";
import test from "node:test";

import { isAwaitingOthers, isAwaitingYourAction, PromiseRole } from "../src/lib/promiseActions";
import { PromiseStatus } from "../src/lib/promiseStatus";

type FixtureRow = {
  role: PromiseRole;
  status: PromiseStatus;
  counterpartyAccepted?: boolean;
};

test("promisor with an active promise should be awaiting your action", () => {
  const row: FixtureRow = { role: "promisor", status: "active", counterpartyAccepted: true };

  assert.equal(isAwaitingYourAction(row), true);
  assert.equal(isAwaitingOthers(row), false);
});

test("counterparty should be awaiting action after promisor marks complete", () => {
  const row: FixtureRow = { role: "counterparty", status: "completed_by_promisor", counterpartyAccepted: true };

  assert.equal(isAwaitingYourAction(row), true);
  assert.equal(isAwaitingOthers(row), false);
});

test("awaiting others mirrors CTA responsibility", () => {
  const row: FixtureRow = { role: "promisor", status: "completed_by_promisor" };

  assert.equal(isAwaitingYourAction(row), false);
  assert.equal(isAwaitingOthers(row), true);
});

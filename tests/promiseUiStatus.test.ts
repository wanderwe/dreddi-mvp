import assert from "node:assert/strict";
import test from "node:test";

import { getPromiseUiStatus } from "../src/lib/promiseUiStatus";

test("getPromiseUiStatus overrides active status when invite is declined", () => {
  const uiStatus = getPromiseUiStatus({
    status: "active",
    invite_status: "declined",
    accepted_at: null,
    counterparty_accepted_at: null,
    declined_at: "2024-01-01T00:00:00Z",
    ignored_at: null,
  });

  assert.equal(uiStatus, "declined");
});

test("getPromiseUiStatus overrides active status when invite is ignored", () => {
  const uiStatus = getPromiseUiStatus({
    status: "active",
    invite_status: "ignored",
    accepted_at: null,
    counterparty_accepted_at: null,
    declined_at: null,
    ignored_at: "2024-01-02T00:00:00Z",
  });

  assert.equal(uiStatus, "ignored");
});

test("getPromiseUiStatus reports pending acceptance when awaiting", () => {
  const uiStatus = getPromiseUiStatus({
    status: "active",
    invite_status: "awaiting_acceptance",
    accepted_at: null,
    counterparty_accepted_at: null,
    declined_at: null,
    ignored_at: null,
  });

  assert.equal(uiStatus, "awaiting_acceptance");
});

test("getPromiseUiStatus preserves lifecycle status after acceptance", () => {
  const uiStatus = getPromiseUiStatus({
    status: "completed_by_promisor",
    invite_status: "accepted",
    accepted_at: "2024-01-03T00:00:00Z",
    counterparty_accepted_at: null,
    declined_at: null,
    ignored_at: null,
  });

  assert.equal(uiStatus, "completed_by_promisor");
});

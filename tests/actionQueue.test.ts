import test from "node:test";
import assert from "node:assert/strict";

import { getActionQueueState } from "@/lib/actionQueue";

const base = {
  id: "p1",
  status: "active" as const,
  due_at: null,
  invite_status: "awaiting_acceptance",
  counterparty_accepted_at: null,
  invited_at: null,
  accepted_at: null,
  declined_at: null,
  ignored_at: null,
  creator_id: "u1",
  promisor_id: null,
  promisee_id: null,
  counterparty_id: "u2",
};

test("does not treat creator as actionable executor before invite acceptance", () => {
  const state = getActionQueueState(base, "u1", new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(state, null);
});

test("shows awaiting_acceptance only for invitee", () => {
  const state = getActionQueueState(base, "u2", new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(state, "awaiting_acceptance");
});

test("does not include declined/ignored invite states", () => {
  const declined = { ...base, invite_status: "declined" };
  const ignored = { ...base, invite_status: "ignored" };
  assert.equal(getActionQueueState(declined, "u1"), null);
  assert.equal(getActionQueueState(ignored, "u1"), null);
});

test("includes active executor only after acceptance", () => {
  const accepted = {
    ...base,
    invite_status: "accepted",
    promisor_id: "u1",
    promisee_id: "u2",
    due_at: "2025-01-01T00:00:00.000Z",
  };
  assert.equal(
    getActionQueueState(accepted, "u1", new Date("2026-01-01T00:00:00.000Z")),
    "overdue"
  );
});

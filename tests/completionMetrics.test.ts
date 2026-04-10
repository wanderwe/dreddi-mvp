import assert from "node:assert/strict";
import test from "node:test";

import { getCompletionMetrics } from "../src/lib/reputation/completionMetrics";

type TestPromise = Parameters<typeof getCompletionMetrics>[0][number];

const baseAccepted = {
  invite_status: "accepted",
  accepted_at: "2026-01-01T00:00:00.000Z",
  declined_at: null,
  ignored_at: null,
  expires_at: null,
  cancelled_at: null,
};

const makePromise = (overrides: Partial<TestPromise>): TestPromise => ({
  ...baseAccepted,
  status: "active",
  completed_at: null,
  creator_id: "user-a",
  promisor_id: "user-a",
  promisee_id: "user-b",
  counterparty_id: "user-b",
  ...overrides,
});

test("completion rate counts only accepted deals where profile user is executor", () => {
  const metrics = getCompletionMetrics([
    makePromise({ status: "active" }),
    makePromise({ status: "completed_by_promisor", completed_at: "2026-01-02T00:00:00.000Z" }),
    makePromise({ status: "confirmed", completed_at: "2026-01-03T00:00:00.000Z" }),
    makePromise({ invite_status: "declined", declined_at: "2026-01-01T12:00:00.000Z" }),
    makePromise({ creator_id: "user-c", promisor_id: "user-c", promisee_id: "user-a", counterparty_id: "user-a" }),
  ]);

  assert.deepEqual(metrics.completionRate, { completed: 2, total: 3 });
});

test("completion review counts only reviewer responses after completion", () => {
  const metrics = getCompletionMetrics([
    makePromise({ creator_id: "user-c", promisor_id: "user-c", promisee_id: "user-a", counterparty_id: "user-a", status: "completed_by_promisor", completed_at: "2026-01-02T00:00:00.000Z" }),
    makePromise({ creator_id: "user-c", promisor_id: "user-c", promisee_id: "user-a", counterparty_id: "user-a", status: "confirmed", completed_at: "2026-01-03T00:00:00.000Z" }),
    makePromise({ creator_id: "user-c", promisor_id: "user-c", promisee_id: "user-a", counterparty_id: "user-a", status: "disputed", completed_at: "2026-01-04T00:00:00.000Z" }),
    makePromise({ creator_id: "user-c", promisor_id: "user-c", promisee_id: "user-a", counterparty_id: "user-a", status: "active" }),
    makePromise({ creator_id: "user-c", promisor_id: "user-c", promisee_id: "user-a", counterparty_id: "user-a", status: "completed_by_promisor", completed_at: "2026-01-05T00:00:00.000Z", invite_status: "expired", expires_at: "2026-01-01T00:00:00.000Z" }),
  ]);

  assert.deepEqual(metrics.completionReview, { responded: 2, total: 3 });
});

test("mixed-role history keeps completion and review metrics separated", () => {
  const metrics = getCompletionMetrics([
    makePromise({ status: "completed_by_promisor", completed_at: "2026-01-02T00:00:00.000Z" }),
    makePromise({ status: "active" }),
    makePromise({ creator_id: "user-c", promisor_id: "user-c", promisee_id: "user-a", counterparty_id: "user-a", status: "confirmed", completed_at: "2026-01-03T00:00:00.000Z" }),
    makePromise({ creator_id: "user-c", promisor_id: "user-c", promisee_id: "user-a", counterparty_id: "user-a", status: "completed_by_promisor", completed_at: "2026-01-04T00:00:00.000Z" }),
  ]);

  assert.deepEqual(metrics, {
    completionRate: { completed: 1, total: 2 },
    completionReview: { responded: 1, total: 2 },
  });
});

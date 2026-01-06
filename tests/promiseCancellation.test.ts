import assert from "node:assert/strict";
import test from "node:test";

import { evaluateCancelPermission } from "../src/lib/promiseCancellation";

const basePromise = {
  status: "completed_by_promisor" as const,
  creator_id: "u1",
  counterparty_id: null as string | null,
};

test("promisor can cancel waiting confirmation when invite not accepted", () => {
  const res = evaluateCancelPermission(basePromise, "u1");
  assert.equal(res.ok, true);
});

test("cannot cancel when counterparty already accepted", () => {
  const res = evaluateCancelPermission({ ...basePromise, counterparty_id: "u2" }, "u1");
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.code, "CANNOT_CANCEL_ACCEPTED");
});

test("cannot cancel finalized promise", () => {
  const res = evaluateCancelPermission({ ...basePromise, status: "confirmed" }, "u1");
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.code, "CANNOT_CANCEL_FINAL_STATUS");
});

test("only promisor can cancel", () => {
  const res = evaluateCancelPermission(basePromise, "someone-else");
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.code, "FORBIDDEN_NOT_PROMISOR");
});

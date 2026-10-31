import assert from "node:assert/strict";
import test from "node:test";

import { isSelfPromise } from "../src/lib/selfPromise";

const at = "2026-10-31T10:00:00.000Z";

test("a promise created already active with no other side is a promise to yourself", () => {
  assert.equal(
    isSelfPromise({ activated_without_counterparty: true, activated_without_counterparty_at: at, invited_at: at, counterparty_id: null }),
    true
  );
});

test("a deal activated later while waiting for someone is not", () => {
  assert.equal(
    isSelfPromise({
      activated_without_counterparty: true,
      activated_without_counterparty_at: "2026-11-02T09:00:00.000Z",
      invited_at: at,
      counterparty_id: null,
    }),
    false
  );
});

test("once someone joined it is not a promise to yourself", () => {
  assert.equal(
    isSelfPromise({ activated_without_counterparty: true, activated_without_counterparty_at: at, invited_at: at, counterparty_id: "u2" }),
    false
  );
  assert.equal(isSelfPromise({ counterparty_id: null }), false);
});

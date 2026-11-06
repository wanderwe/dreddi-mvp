import assert from "node:assert/strict";
import test from "node:test";

import { isCompletedOnTime, resolveConfirmedOnTime } from "../src/lib/reputation/onTime";

const due = "2026-11-07T09:00:00.000Z";

test("the confirming side's word settles on time", () => {
  assert.equal(isCompletedOnTime({ due_at: due, completed_at: "2026-11-09T10:00:00.000Z", completed_on_time: true }), true);
  assert.equal(isCompletedOnTime({ due_at: due, completed_at: "2026-11-06T10:00:00.000Z", completed_on_time: false }), false);
});

test("without it, marking done by the deadline decides, as before", () => {
  assert.equal(isCompletedOnTime({ due_at: due, completed_at: "2026-11-07T08:00:00.000Z" }), true);
  assert.equal(isCompletedOnTime({ due_at: due, completed_at: "2026-11-07T10:00:00.000Z", completed_on_time: null }), false);
  assert.equal(isCompletedOnTime({ due_at: due, completed_at: null }), false);
  assert.equal(isCompletedOnTime({ due_at: null, completed_at: "2026-11-07T08:00:00.000Z", completed_on_time: true }), false);
});

test("confirming before the deadline, or after one marked done in time, is on time whatever the answer", () => {
  assert.equal(resolveConfirmedOnTime({ due_at: due, completed_at: null }, false, new Date("2026-11-07T08:30:00.000Z")), true);
  assert.equal(
    resolveConfirmedOnTime({ due_at: due, completed_at: "2026-11-07T08:00:00.000Z" }, false, new Date("2026-11-08T12:00:00.000Z")),
    true
  );
});

test("after the deadline the confirming side's answer decides", () => {
  const late = new Date("2026-11-09T12:00:00.000Z");
  assert.equal(resolveConfirmedOnTime({ due_at: due, completed_at: null }, true, late), true);
  assert.equal(resolveConfirmedOnTime({ due_at: due, completed_at: "2026-11-08T12:00:00.000Z" }, false, late), false);
  assert.equal(resolveConfirmedOnTime({ due_at: due, completed_at: null }, undefined, late), null);
  assert.equal(resolveConfirmedOnTime({ due_at: null, completed_at: null }, true, late), null);
});

import assert from "node:assert/strict";
import test from "node:test";

import { getLifetimePaceMetrics, getMonthlyPace } from "../src/lib/paceMetrics";

const NOW = new Date("2026-06-01T12:00:00.000Z").getTime();


test("getMonthlyPace returns 3.8/month for five deals over 39 active days", () => {
  assert.equal(getMonthlyPace(5, 39), 3.8);
});

test("getMonthlyPace returns 0 for non-positive inputs", () => {
  assert.equal(getMonthlyPace(0, 39), 0);
  assert.equal(getMonthlyPace(5, 0), 0);
});

test("returns 1/month for one confirmed deal when active period is less than 30 days", () => {
  const metrics = getLifetimePaceMetrics([{ accepted_at: "2026-05-20T10:00:00.000Z" }], NOW);

  assert.equal(metrics.totalDeals, 1);
  assert.equal(metrics.activeDays, 12);
  assert.equal(metrics.pace, 1);
});

test("returns 2.7/month for five confirmed deals over ~56 active days", () => {
  const metrics = getLifetimePaceMetrics(
    [
      { accepted_at: "2026-04-06T11:00:00.000Z" },
      { accepted_at: "2026-04-20T09:00:00.000Z" },
      { accepted_at: "2026-05-01T15:00:00.000Z" },
      { accepted_at: "2026-05-20T13:00:00.000Z" },
      { accepted_at: "2026-05-30T08:30:00.000Z" },
    ],
    NOW
  );

  assert.equal(metrics.totalDeals, 5);
  assert.equal(metrics.activeDays, 56);
  assert.equal(metrics.pace, 2.7);
});

test("returns non-zero pace for old history even with no recent deals", () => {
  const metrics = getLifetimePaceMetrics(
    [
      { accepted_at: "2025-01-01T00:00:00.000Z" },
      { accepted_at: "2025-04-01T00:00:00.000Z" },
      { accepted_at: "2025-08-01T00:00:00.000Z" },
      { accepted_at: "2025-10-01T00:00:00.000Z" },
      { accepted_at: "2025-12-01T00:00:00.000Z" },
    ],
    NOW
  );

  assert.equal(metrics.totalDeals, 5);
  assert.equal(metrics.activeDays > 30, true);
  assert.equal(metrics.pace > 0, true);
});

test("returns zero pace and zero active days when no confirmed deals exist", () => {
  const metrics = getLifetimePaceMetrics(
    [{ accepted_at: null }, { accepted_at: "invalid-date" }],
    NOW
  );

  assert.equal(metrics.totalDeals, 0);
  assert.equal(metrics.activeDays, 0);
  assert.equal(metrics.pace, 0);
});

test("uses counterparty acceptance timestamp when accepted_at is missing", () => {
  const metrics = getLifetimePaceMetrics(
    [
      { accepted_at: null, counterparty_accepted_at: "2026-05-20T10:00:00.000Z" },
      { accepted_at: null, counterparty_accepted_at: "2026-05-28T10:00:00.000Z" },
    ],
    NOW
  );

  assert.equal(metrics.totalDeals, 2);
  assert.equal(metrics.activeDays, 12);
  assert.equal(metrics.pace, 2);
});

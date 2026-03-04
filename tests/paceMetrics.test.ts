import assert from "node:assert/strict";
import test from "node:test";

import { getPaceMetricsLast30Days } from "../src/lib/paceMetrics";

const NOW = new Date("2026-06-01T12:00:00.000Z").getTime();

test("returns 1/month for exactly one accepted deal in the last 30 days", () => {
  const metrics = getPaceMetricsLast30Days(
    [
      { accepted_at: "2026-05-15T10:00:00.000Z" },
      { accepted_at: null },
      { accepted_at: "invalid-date" },
    ],
    NOW
  );

  assert.equal(metrics.deals30d, 1);
  assert.equal(metrics.activeDays30d, 1);
});

test("returns 5/month for five accepted deals in the last 30 days", () => {
  const metrics = getPaceMetricsLast30Days(
    [
      { accepted_at: "2026-05-03T09:00:00.000Z" },
      { accepted_at: "2026-05-04T09:00:00.000Z" },
      { accepted_at: "2026-05-04T18:00:00.000Z" },
      { accepted_at: "2026-05-20T13:00:00.000Z" },
      { accepted_at: "2026-05-25T11:00:00.000Z" },
    ],
    NOW
  );

  assert.equal(metrics.deals30d, 5);
  assert.equal(metrics.activeDays30d, 4);
});

test("returns 0/month when accepted deals are older than 30 days", () => {
  const metrics = getPaceMetricsLast30Days(
    [
      { accepted_at: "2026-04-01T09:00:00.000Z" },
      { accepted_at: "2026-04-15T09:00:00.000Z" },
      { accepted_at: "2026-04-30T09:00:00.000Z" },
      { accepted_at: "2026-03-20T09:00:00.000Z" },
      { accepted_at: "2026-03-10T09:00:00.000Z" },
    ],
    NOW
  );

  assert.equal(metrics.deals30d, 0);
  assert.equal(metrics.activeDays30d, 0);
});

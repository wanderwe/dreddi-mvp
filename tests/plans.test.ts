import test from "node:test";
import assert from "node:assert/strict";
import { disputesLeft, monthStart, parsePlan, planLimitsEnabled } from "../src/lib/billing/plans";

test("plans: free has 5 disputes a month, pro has no limit", () => {
  assert.equal(disputesLeft("free", 0), 5);
  assert.equal(disputesLeft("free", 4), 1);
  assert.equal(disputesLeft("free", 7), 0);
  assert.equal(disputesLeft("pro", 100), null);
});

test("plans: anything unknown is free", () => {
  assert.equal(parsePlan("pro"), "pro");
  assert.equal(parsePlan("enterprise"), "free");
  assert.equal(parsePlan(null), "free");
});

test("plans: the month starts on the 1st, UTC", () => {
  assert.equal(monthStart(new Date("2026-11-27T15:00:00Z")).toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(monthStart(new Date("2027-01-01T00:00:00Z")).toISOString(), "2027-01-01T00:00:00.000Z");
});

test("plans: limits are off unless the flag says true", () => {
  const before = process.env.PLAN_LIMITS_ENABLED;
  delete process.env.PLAN_LIMITS_ENABLED;
  assert.equal(planLimitsEnabled(), false);
  process.env.PLAN_LIMITS_ENABLED = "true";
  assert.equal(planLimitsEnabled(), true);
  if (before === undefined) delete process.env.PLAN_LIMITS_ENABLED;
  else process.env.PLAN_LIMITS_ENABLED = before;
});

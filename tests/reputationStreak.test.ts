import assert from "node:assert/strict";
import test from "node:test";

import { computeDealStreak } from "../src/lib/reputation/streak";

test("confirmed -> confirmed -> disputed gives streak 2", () => {
  const streak = computeDealStreak([
    { status: "confirmed", confirmed_at: "2024-05-03T10:00:00.000Z" },
    { status: "confirmed", confirmed_at: "2024-05-02T10:00:00.000Z" },
    { status: "disputed", disputed_at: "2024-05-01T10:00:00.000Z" },
  ]);

  assert.equal(streak, 2);
});

test("latest disputed gives streak 0", () => {
  const streak = computeDealStreak([
    { status: "confirmed", confirmed_at: "2024-05-01T10:00:00.000Z" },
    { status: "disputed", disputed_at: "2024-05-04T10:00:00.000Z" },
  ]);

  assert.equal(streak, 0);
});

test("five latest confirmed gives streak 5", () => {
  const streak = computeDealStreak([
    { status: "confirmed", confirmed_at: "2024-05-05T10:00:00.000Z" },
    { status: "confirmed", confirmed_at: "2024-05-04T10:00:00.000Z" },
    { status: "confirmed", confirmed_at: "2024-05-03T10:00:00.000Z" },
    { status: "confirmed", confirmed_at: "2024-05-02T10:00:00.000Z" },
    { status: "confirmed", confirmed_at: "2024-05-01T10:00:00.000Z" },
  ]);

  assert.equal(streak, 5);
});

test("older disputes do not break a recent clean chain", () => {
  const streak = computeDealStreak([
    { status: "disputed", disputed_at: "2024-04-28T10:00:00.000Z" },
    { status: "confirmed", confirmed_at: "2024-05-03T10:00:00.000Z" },
    { status: "confirmed", confirmed_at: "2024-05-02T10:00:00.000Z" },
    { status: "confirmed", confirmed_at: "2024-05-01T10:00:00.000Z" },
  ]);

  assert.equal(streak, 3);
});

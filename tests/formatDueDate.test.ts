import assert from "node:assert/strict";
import test from "node:test";

import { formatDueDate } from "../src/lib/formatDueDate";

test("formatDueDate returns null for missing values", () => {
  assert.equal(formatDueDate(null, "en-US"), null);
});

test("formatDueDate omits time even when a timestamp is provided", () => {
  const formatted = formatDueDate("2024-06-15T12:34:00Z", "en-US", { includeYear: true });

  assert.ok(formatted);
  assert.equal(formatted?.includes(":"), false);
});

test("formatDueDate can omit the year when requested", () => {
  const formatted = formatDueDate("2024-06-15T12:34:00Z", "en-US", { includeYear: false });

  assert.ok(formatted);
  assert.equal(formatted?.includes("2024"), false);
});

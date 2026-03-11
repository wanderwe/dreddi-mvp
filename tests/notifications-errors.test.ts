import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isNotificationTypeConstraintError } from "../src/lib/notifications/errors";

describe("notification error helpers", () => {
  it("detects notifications type constraint violations", () => {
    const detail =
      'new row for relation "notifications" violates check constraint "notifications_type_valid"';

    assert.equal(isNotificationTypeConstraintError(detail), true);
  });

  it("ignores unrelated database errors", () => {
    assert.equal(isNotificationTypeConstraintError("duplicate key value violates unique constraint"), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isEmailEligibleType } from "../src/lib/notifications/email";

describe("notification email eligibility", () => {
  it("includes manual reminder trigger notification types", () => {
    assert.equal(isEmailEligibleType("reminder_overdue"), true);
    assert.equal(isEmailEligibleType("marked_completed"), true);
  });

  it("does not include passive in-app-only notifications", () => {
    assert.equal(isEmailEligibleType("invite_ignored"), false);
  });
});

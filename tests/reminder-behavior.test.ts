import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getNotificationCopy } from "../src/lib/notifications/copy";
import { authorizeCron, isEligibleDeadlineReminder } from "../src/app/api/notifications/cron/route";

describe("manual reminder copy", () => {
  it("does not mention deadline for no-deadline promises", () => {
    const copy = getNotificationCopy({ locale: "uk", type: "reminder_manual" });
    assert.equal(copy.title, "Нагадування");
    assert.equal(copy.body.includes("дедлайн"), false);
  });
});

describe("deadline reminder eligibility", () => {
  it("does not trigger when due_at is null", () => {
    assert.equal(isEligibleDeadlineReminder(null, new Date("2026-01-01T00:00:00Z")), false);
  });
});

describe("cron auth", () => {
  it("returns 401 when bearer token is missing", () => {
    process.env.CRON_SECRET = "secret";
    const req = new Request("https://www.dreddi.com/api/notifications/cron");
    const response = authorizeCron(req);
    assert.equal(response?.status, 401);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getNotificationCopy } from "../src/lib/notifications/copy";
import {
  authorizeCron,
  getOverdueTimeBucket,
  isEligibleDeadlineReminder,
  shouldSendOverdueReminder,
} from "../src/app/api/notifications/cron/route";

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

describe("overdue reminder cadence", () => {
  it("repeats only after 72h window elapses", () => {
    const now = new Date("2026-01-05T00:00:00Z");
    assert.equal(shouldSendOverdueReminder(null, now), true);
    assert.equal(shouldSendOverdueReminder("2026-01-02T00:00:00Z", now), true);
    assert.equal(shouldSendOverdueReminder("2026-01-03T12:01:00Z", now), false);
  });

  it("uses a stable 72h time bucket", () => {
    const first = getOverdueTimeBucket(new Date("2026-01-05T00:00:00Z"));
    const second = getOverdueTimeBucket(new Date("2026-01-05T10:00:00Z"));
    assert.equal(first, second);
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getNotificationCopy } from "../src/lib/notifications/copy";
import { authorizeCron, isEligibleDeadlineReminder } from "../src/app/api/notifications/cron/route";
import { isReminderEmailRateLimited } from "../src/lib/notifications/email";

type Row = Record<string, unknown>;

class FakeQuery {
  private filters: Array<(row: Row) => boolean> = [];
  constructor(private rows: Row[]) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  gte(column: string, value: string) {
    this.filters.push((row) => String(row[column]) >= value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  async maybeSingle() {
    const filtered = this.rows.filter((row) => this.filters.every((filter) => filter(row)));
    return { data: filtered[0] ?? null };
  }
}

class FakeAdmin {
  constructor(private rows: Row[]) {}
  from() {
    return new FakeQuery(this.rows);
  }
}

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

describe("reminder email rate limit", () => {
  it("skips second run within 24h", async () => {
    const now = new Date("2026-01-02T00:00:00Z");
    const firstRun = new FakeAdmin([]);
    const first = await isReminderEmailRateLimited(
      firstRun as never,
      {
        eventId: "event-1",
        userId: "user-1",
        promiseId: "promise-1",
        type: "reminder_manual",
        dedupeKey: "reminder_manual:promise-1:user-1",
        ctaUrl: "/promises/promise-1",
        title: "Reminder",
        body: "Body",
      },
      now
    );

    const secondRun = new FakeAdmin([
      {
        id: "send-1",
        user_id: "user-1",
        promise_id: "promise-1",
        type: "reminder_manual",
        status: "sent",
        created_at: "2026-01-01T12:00:00Z",
      },
    ]);

    const second = await isReminderEmailRateLimited(
      secondRun as never,
      {
        eventId: "event-2",
        userId: "user-1",
        promiseId: "promise-1",
        type: "reminder_manual",
        dedupeKey: "reminder_manual:promise-1:user-1",
        ctaUrl: "/promises/promise-1",
        title: "Reminder",
        body: "Body",
      },
      now
    );

    assert.equal(first, false);
    assert.equal(second, true);
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

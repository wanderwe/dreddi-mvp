import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCompletionOutcomeNotification,
  buildCompletionWaitingNotification,
  buildInviteAcceptedNotifications,
} from "../src/lib/notifications/flows";
import { fetchUnreadNotificationCount } from "../src/lib/notifications/queries";

describe("notification flows", () => {
  it("builds invite accepted notifications for creator and executor", () => {
    const notifications = buildInviteAcceptedNotifications({
      id: "promise-123",
      creator_id: "creator-1",
      promisor_id: "executor-1",
      promisee_id: "creator-1",
      counterparty_id: "executor-1",
    });

    assert.equal(notifications.length, 2);
    assert.equal(notifications[0].userId, "executor-1");
    assert.equal(notifications[0].type, "invite_followup");
    assert.equal(notifications[0].role, "executor");
    assert.equal(notifications[1].userId, "creator-1");
    assert.equal(notifications[1].role, "creator");
  });

  it("builds completion waiting notification with cycle dedupe key", () => {
    const notification = buildCompletionWaitingNotification({
      promiseId: "promise-456",
      creatorId: "creator-2",
      cycleId: 3,
    });

    assert.equal(notification.userId, "creator-2");
    assert.equal(notification.type, "completion_waiting");
    assert.equal(notification.dedupeKey, "completion_waiting:promise-456:3:initial");
    assert.equal(notification.ctaUrl, "/promises/promise-456/confirm");
  });

  it("builds completion outcome notification for executor", () => {
    const notification = buildCompletionOutcomeNotification({
      promiseId: "promise-789",
      executorId: "executor-2",
      type: "dispute",
      delta: -2,
    });

    assert.equal(notification.userId, "executor-2");
    assert.equal(notification.type, "dispute");
    assert.equal(notification.dedupeKey, "dispute:promise-789");
    assert.equal(notification.delta, -2);
  });
});

describe("notification unread count query", () => {
  it("counts unread notifications for the user", async () => {
    const calls: {
      table?: string;
      select?: { columns: string; options: { count: string; head: boolean } };
      eq?: Array<[string, string]>;
      is?: Array<[string, null]>;
    } = {};

    const chain = {
      select(columns: string, options: { count: string; head: boolean }) {
        calls.select = { columns, options };
        return chain;
      },
      eq(column: string, value: string) {
        calls.eq = [...(calls.eq ?? []), [column, value]];
        return chain;
      },
      async is(column: string, value: null) {
        calls.is = [...(calls.is ?? []), [column, value]];
        return { count: 5 };
      },
    };

    const supabase = {
      from(table: string) {
        calls.table = table;
        return chain;
      },
    };

    const count = await fetchUnreadNotificationCount(supabase as never, "user-123");

    assert.equal(count, 5);
    assert.equal(calls.table, "notifications");
    assert.deepEqual(calls.eq, [["user_id", "user-123"]]);
    assert.deepEqual(calls.is, [["read_at", null]]);
    assert.deepEqual(calls.select, { columns: "id", options: { count: "exact", head: true } });
  });
});

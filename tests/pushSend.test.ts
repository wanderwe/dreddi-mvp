import assert from "node:assert/strict";
import test from "node:test";
import webpush from "web-push";

// sendPushToUser: every device of the person gets the message; a device the push service says is
// gone (404/410) is removed; other failures keep the device for the next time.

const keys = webpush.generateVAPIDKeys();
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = keys.publicKey;
process.env.VAPID_PRIVATE_KEY = keys.privateKey;

type Row = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; last_sent_at?: string };

class FakeAdmin {
  deleted: string[] = [];
  touched: string[] = [];
  constructor(public rows: Row[]) {}
  from = () => {
    const query = {
      filters: {} as Record<string, string>,
      op: "select" as "select" | "delete" | "update",
      select() { return query; },
      delete() { query.op = "delete"; return query; },
      update() { query.op = "update"; return query; },
      eq(column: string, value: string) { query.filters[column] = value; return query; },
      in: (_column: string, ids: string[]) => {
        if (query.op === "delete") this.deleted.push(...ids);
        if (query.op === "update") this.touched.push(...ids);
        return Promise.resolve({ error: null });
      },
      returns: () => Promise.resolve({ data: this.rows.filter((row) => row.user_id === query.filters.user_id) }),
    };
    return query;
  };
}

test("pushes reach live devices, gone ones are removed, others are kept", async () => {
  const sent: string[] = [];
  const original = webpush.sendNotification;
  webpush.sendNotification = (async (subscription: { endpoint: string }, payload: string) => {
    assert.deepEqual(JSON.parse(payload), { title: "Підтвердіть виконання", body: "Ігор позначив обіцянку", url: "/promises/1" });
    if (subscription.endpoint.endsWith("gone")) throw Object.assign(new Error("gone"), { statusCode: 410 });
    if (subscription.endpoint.endsWith("flaky")) throw Object.assign(new Error("timeout"), { statusCode: 500 });
    sent.push(subscription.endpoint);
    return { statusCode: 201, body: "", headers: {} };
  }) as typeof webpush.sendNotification;

  try {
    const { sendPushToUser } = await import("../src/lib/push/send");
    const row = (id: string, endpoint: string, user_id = "u1"): Row => ({ id, user_id, endpoint, p256dh: "k", auth: "a" });
    const admin = new FakeAdmin([
      row("1", "https://push.example/phone"),
      row("2", "https://push.example/gone"),
      row("3", "https://push.example/flaky"),
      row("4", "https://push.example/someone-else", "u2"),
    ]);

    const result = await sendPushToUser(admin as never, "u1", {
      title: "Підтвердіть виконання",
      body: "Ігор позначив обіцянку",
      url: "/promises/1",
    });

    assert.deepEqual(sent, ["https://push.example/phone"]);
    assert.deepEqual(result, { sent: 1, removed: 1 });
    assert.deepEqual(admin.deleted, ["2"]);
    assert.deepEqual(admin.touched, ["1"]);
  } finally {
    webpush.sendNotification = original;
  }
});

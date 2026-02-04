import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createNotification } from "../src/lib/notifications/service";
import type { NotificationRequest } from "../src/lib/notifications/service";

type TableRow = Record<string, unknown>;

class FakeQueryBuilder {
  private readonly rows: TableRow[];
  private readonly insertTarget: TableRow[];
  private readonly filters: Array<(row: TableRow) => boolean> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private selectOptions: { count?: string; head?: boolean } | null = null;

  constructor(rows: TableRow[], insertTarget: TableRow[]) {
    this.rows = rows;
    this.insertTarget = insertTarget;
  }

  select(_columns: string, options?: { count?: string; head?: boolean }) {
    this.selectOptions = options ?? null;
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

  order(column: string, { ascending }: { ascending: boolean }) {
    this.orderBy = { column, ascending };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async maybeSingle() {
    const rows = this.apply();
    if (this.selectOptions?.count) {
      return { count: rows.length };
    }
    return { data: rows[0] ?? null };
  }

  async insert(payload: TableRow | TableRow[]) {
    const items = Array.isArray(payload) ? payload : [payload];
    items.forEach((row) => {
      if (!row.created_at) {
        row.created_at = new Date().toISOString();
      }
      this.insertTarget.push(row);
    });
    return { error: null };
  }

  then<TResult1 = { data: TableRow[] | null; count?: number }, TResult2 = never>(
    onfulfilled?:
      | ((
          value: { data: TableRow[] | null; count?: number }
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute() {
    const rows = this.apply();
    if (this.selectOptions?.count) {
      return { data: this.selectOptions.head ? null : rows, count: rows.length };
    }
    return { data: rows };
  }

  private apply() {
    let rows = [...this.rows];
    this.filters.forEach((filter) => {
      rows = rows.filter(filter);
    });
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      rows.sort((a, b) => {
        const left = String(a[column] ?? "");
        const right = String(b[column] ?? "");
        return ascending ? left.localeCompare(right) : right.localeCompare(left);
      });
    }
    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }
    return rows;
  }
}

class FakeSupabaseClient {
  private readonly tables: Record<string, TableRow[]>;

  constructor(tables: Record<string, TableRow[]>) {
    this.tables = tables;
  }

  from(table: string) {
    const rows = this.tables[table] ?? [];
    return new FakeQueryBuilder(rows, rows);
  }
}

const buildRequest = (overrides: Partial<NotificationRequest> = {}): NotificationRequest => ({
  userId: "user-1",
  promiseId: "promise-1",
  type: "due_soon",
  dedupeKey: "due_soon:promise-1:1",
  ctaUrl: "/promises/promise-1",
  priority: "normal",
  ...overrides,
});

describe("notification service caps", () => {
  it("allows due soon after recent invite for same deal", async () => {
    const admin = new FakeSupabaseClient({
      notifications: [
        {
          user_id: "user-1",
          promise_id: "promise-1",
          type: "invite",
          created_at: "2024-02-01T06:00:00Z",
          dedupe_key: "invite:promise-1:0",
        },
      ],
    });

    const outcome = await createNotification(admin as never, buildRequest(), new Date("2024-02-01T12:00:00Z"));

    assert.equal(outcome.created, true);
  });

  it("allows overdue even when daily cap is reached", async () => {
    const admin = new FakeSupabaseClient({
      notifications: [
        {
          user_id: "user-1",
          promise_id: "promise-1",
          type: "invite",
          created_at: "2024-02-01T06:00:00Z",
          dedupe_key: "invite:promise-1:0",
        },
        {
          user_id: "user-1",
          promise_id: "promise-2",
          type: "invite",
          created_at: "2024-02-01T07:00:00Z",
          dedupe_key: "invite:promise-2:0",
        },
        {
          user_id: "user-1",
          promise_id: "promise-3",
          type: "invite",
          created_at: "2024-02-01T08:00:00Z",
          dedupe_key: "invite:promise-3:0",
        },
      ],
    });

    const outcome = await createNotification(
      admin as never,
      buildRequest({ type: "overdue", dedupeKey: "overdue:promise-1:1", priority: "high" }),
      new Date("2024-02-01T12:00:00Z")
    );

    assert.equal(outcome.created, true);
  });

  it("blocks repeated same-type notifications within 24 hours", async () => {
    const admin = new FakeSupabaseClient({
      notifications: [
        {
          user_id: "user-1",
          promise_id: "promise-1",
          type: "due_soon",
          created_at: "2024-02-01T06:00:00Z",
          dedupe_key: "due_soon:promise-1:0",
        },
      ],
    });

    const outcome = await createNotification(admin as never, buildRequest(), new Date("2024-02-01T12:00:00Z"));

    assert.equal(outcome.created, false);
    assert.equal(outcome.skippedReason, "per_deal_cap");
  });
});

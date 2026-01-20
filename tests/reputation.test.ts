import assert from "node:assert/strict";
import test from "node:test";

import { applyReputationForPromiseFinalization } from "../src/lib/reputation/applyReputation";
import type { PromiseStatus } from "../src/lib/promiseStatus";

type ReputationRow = {
  user_id: string;
  score: number;
  confirmed_count: number;
  disputed_count: number;
  on_time_count: number;
  total_promises_completed: number;
  updated_at: string;
};

type ReputationEvent = {
  user_id: string;
  promise_id: string;
  kind: string;
  delta: number;
  meta: Record<string, unknown>;
};

class FakeQuery {
  private table: string;
  private store: FakeAdmin;
  private action: "select" | "insert" | "update" | "upsert" | null = null;
  private filters: Record<string, string | string[]> = {};
  private payload: unknown = null;
  private single = false;

  constructor(table: string, store: FakeAdmin) {
    this.table = table;
    this.store = store;
  }

  select() {
    this.action = "select";
    return this;
  }

  insert(payload: unknown) {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: unknown) {
    this.action = "update";
    this.payload = payload;
    return this;
  }

  upsert(payload: unknown) {
    this.action = "upsert";
    this.payload = payload;
    return this;
  }

  eq(field: string, value: string) {
    this.filters[field] = value;
    return this;
  }

  in(field: string, values: string[]) {
    this.filters[field] = values;
    return this;
  }

  maybeSingle() {
    this.single = true;
    return this;
  }

  async execute() {
    if (this.table === "reputation_events" && this.action === "select") {
      const events = this.store.events.filter((event) => {
        const promiseFilter = this.filters.promise_id;
        const userFilter = this.filters.user_id;
        const kindFilter = this.filters.kind;
        const matchesPromise =
          typeof promiseFilter === "string" ? event.promise_id === promiseFilter : true;
        const matchesUser =
          Array.isArray(userFilter) ? userFilter.includes(event.user_id) : true;
        const matchesKind =
          Array.isArray(kindFilter) ? kindFilter.includes(event.kind) : true;
        return matchesPromise && matchesUser && matchesKind;
      });
      return { data: events.map((event) => ({ user_id: event.user_id, kind: event.kind })) };
    }

    if (this.table === "reputation_events" && this.action === "insert") {
      const items = Array.isArray(this.payload) ? (this.payload as ReputationEvent[]) : [];
      this.store.events.push(...items);
      return { error: null };
    }

    if (this.table === "user_reputation" && this.action === "upsert") {
      const rows = Array.isArray(this.payload) ? (this.payload as { user_id: string }[]) : [];
      for (const row of rows) {
        if (!this.store.reputation.has(row.user_id)) {
          this.store.reputation.set(row.user_id, {
            user_id: row.user_id,
            score: 50,
            confirmed_count: 0,
            disputed_count: 0,
            on_time_count: 0,
            total_promises_completed: 0,
            updated_at: new Date().toISOString(),
          });
        }
      }
      return { error: null };
    }

    if (this.table === "user_reputation" && this.action === "select") {
      const userId = this.filters.user_id;
      if (typeof userId !== "string") return { data: null };
      const row = this.store.reputation.get(userId) ?? null;
      return this.single ? { data: row } : { data: row ? [row] : [] };
    }

    if (this.table === "user_reputation" && this.action === "update") {
      const userId = this.filters.user_id;
      if (typeof userId === "string") {
        const existing = this.store.reputation.get(userId);
        if (existing && this.payload && typeof this.payload === "object") {
          this.store.reputation.set(userId, { ...existing, ...(this.payload as ReputationRow) });
        }
      }
      return { error: null };
    }

    return { data: null, error: null };
  }

  then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
    return this.execute().then(onFulfilled, onRejected);
  }
}

class FakeAdmin {
  events: ReputationEvent[] = [];
  reputation = new Map<string, ReputationRow>();

  from(table: string) {
    return new FakeQuery(table, this);
  }
}

test("reputation applies to executor and is idempotent", async () => {
  const admin = new FakeAdmin();
  const promise = {
    id: "promise-1",
    title: "Ship feature",
    status: "confirmed" as PromiseStatus,
    due_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    creator_id: "creator",
    counterparty_id: "executor",
    promisor_id: "executor",
    promisee_id: "creator",
    confirmed_at: new Date().toISOString(),
    disputed_at: null,
    disputed_code: null,
    dispute_reason: null,
    condition_text: null,
    condition_met_at: null,
    condition_met_by: null,
    invite_status: "accepted" as const,
    invited_at: new Date().toISOString(),
    accepted_at: new Date().toISOString(),
    declined_at: null,
    ignored_at: null,
    acceptance_mode: "all" as const,
    acceptance_threshold: null,
  };

  await applyReputationForPromiseFinalization(admin as never, promise);
  await applyReputationForPromiseFinalization(admin as never, promise);

  const executor = admin.reputation.get("executor");
  const creator = admin.reputation.get("creator");

  assert.equal(executor?.score, 54);
  assert.equal(executor?.confirmed_count, 1);
  assert.equal(executor?.on_time_count, 1);
  assert.equal(executor?.total_promises_completed, 1);

  assert.equal(creator, undefined);

  assert.equal(admin.events.length, 1);
});

test("reputation applies to creator on self deals", async () => {
  const admin = new FakeAdmin();
  const promise = {
    id: "promise-2",
    title: "Solo work",
    status: "confirmed" as PromiseStatus,
    due_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    creator_id: "creator",
    counterparty_id: null,
    promisor_id: null,
    promisee_id: null,
    confirmed_at: new Date().toISOString(),
    disputed_at: null,
    disputed_code: null,
    dispute_reason: null,
    condition_text: null,
    condition_met_at: null,
    condition_met_by: null,
    invite_status: "accepted" as const,
    invited_at: new Date().toISOString(),
    accepted_at: new Date().toISOString(),
    declined_at: null,
    ignored_at: null,
    acceptance_mode: "all" as const,
    acceptance_threshold: null,
  };

  await applyReputationForPromiseFinalization(admin as never, promise);

  const creator = admin.reputation.get("creator");

  assert.equal(creator?.score, 54);
  assert.equal(creator?.confirmed_count, 1);
  assert.equal(creator?.on_time_count, 1);
  assert.equal(creator?.total_promises_completed, 1);
  assert.equal(admin.events.length, 1);
});

test("reputation does not apply when executor is missing", async () => {
  const admin = new FakeAdmin();
  const promise = {
    id: "promise-3",
    title: "Pending invite",
    status: "confirmed" as PromiseStatus,
    due_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    creator_id: "creator",
    counterparty_id: null,
    promisor_id: null,
    promisee_id: "creator",
    confirmed_at: new Date().toISOString(),
    disputed_at: null,
    disputed_code: null,
    dispute_reason: null,
    condition_text: null,
    condition_met_at: null,
    condition_met_by: null,
    invite_status: "awaiting_acceptance" as const,
    invited_at: new Date().toISOString(),
    accepted_at: null,
    declined_at: null,
    ignored_at: null,
    acceptance_mode: "all" as const,
    acceptance_threshold: null,
  };

  await applyReputationForPromiseFinalization(admin as never, promise);

  assert.equal(admin.reputation.size, 0);
  assert.equal(admin.events.length, 0);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveCounterpartyId,
  resolveExecutorId,
  PromiseParticipants,
} from "../src/lib/promiseParticipants";

test("resolveExecutorId prefers promisor when present", () => {
  const record: PromiseParticipants = {
    creator_id: "creator",
    promisor_id: "executor",
    promisee_id: "counterparty",
    counterparty_id: "counterparty",
  };

  assert.equal(resolveExecutorId(record), "executor");
});

test("resolveExecutorId falls back to creator when no promisor or promisee", () => {
  const record: PromiseParticipants = {
    creator_id: "creator",
    promisor_id: null,
    promisee_id: null,
    counterparty_id: "counterparty",
  };

  assert.equal(resolveExecutorId(record), "creator");
});

test("resolveExecutorId is null when executor is not yet assigned", () => {
  const record: PromiseParticipants = {
    creator_id: "creator",
    promisor_id: null,
    promisee_id: "creator",
    counterparty_id: null,
  };

  assert.equal(resolveExecutorId(record), null);
});

test("resolveCounterpartyId prefers promisee when present", () => {
  const record: PromiseParticipants = {
    creator_id: "creator",
    promisor_id: "executor",
    promisee_id: "creator",
    counterparty_id: "executor",
  };

  assert.equal(resolveCounterpartyId(record), "creator");
});

test("resolveCounterpartyId falls back to counterparty_id", () => {
  const record: PromiseParticipants = {
    creator_id: "creator",
    promisor_id: "executor",
    promisee_id: null,
    counterparty_id: "counterparty",
  };

  assert.equal(resolveCounterpartyId(record), "counterparty");
});

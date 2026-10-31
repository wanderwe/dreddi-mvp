import assert from "node:assert/strict";
import test from "node:test";

import { getRulingState, type RulingRow } from "../src/lib/ai/judgeRuling";

const both = ["promisor", "counterparty"] as const;
const row = (id: string, author_role: RulingRow["author_role"], created_at: string, extra: Partial<RulingRow> = {}) => ({
  id,
  author_role,
  created_at,
  verdict: null,
  approves_message_id: null,
  ...extra,
});

const ruled: RulingRow[] = [
  row("m1", "promisor", "2026-10-20T10:00:00Z"),
  row("j1", "judge", "2026-10-20T10:00:05Z", { verdict: "kept" }),
];

test("no ruling while the judge is undecided", () => {
  const rows = [row("m1", "promisor", "2026-10-20T10:00:00Z"), row("j1", "judge", "2026-10-20T10:00:05Z", { verdict: "undecided" })];
  assert.equal(getRulingState(rows, [...both]), null);
});

test("binds at once for a promise with no other side", () => {
  assert.equal(getRulingState(ruled, ["promisor"], new Date("2026-10-20T11:00:00Z"))?.binding, "self");
});

test("pending until both sides accept or the response window passes", () => {
  const early = new Date("2026-10-21T10:00:00Z");
  assert.equal(getRulingState(ruled, [...both], early)?.binding, null);

  const oneAccepted = [...ruled, row("a1", "promisor", "2026-10-20T12:00:00Z", { approves_message_id: "j1" })];
  const state = getRulingState(oneAccepted, [...both], early);
  assert.deepEqual(state?.acceptedBy, ["promisor"]);
  assert.equal(state?.binding, null);

  const bothAccepted = [...oneAccepted, row("a2", "counterparty", "2026-10-20T13:00:00Z", { approves_message_id: "j1" })];
  assert.equal(getRulingState(bothAccepted, [...both], early)?.binding, "accepted");

  assert.equal(getRulingState(oneAccepted, [...both], new Date("2026-10-23T10:00:06Z"))?.binding, "silence");
});

test("a message after the ruling is an appeal and keeps the case open", () => {
  const appealed = [...ruled, row("m2", "counterparty", "2026-10-21T09:00:00Z")];
  const state = getRulingState(appealed, [...both], new Date("2026-10-30T00:00:00Z"));
  assert.equal(state?.appealed, true);
  assert.equal(state?.binding, null);
});

test("a newer ruling replaces the old one", () => {
  const rows = [
    ...ruled,
    row("m2", "counterparty", "2026-10-21T09:00:00Z"),
    row("j2", "judge", "2026-10-21T09:00:05Z", { verdict: "not_kept" }),
  ];
  const state = getRulingState(rows, [...both], new Date("2026-10-21T10:00:00Z"));
  assert.equal(state?.rulingId, "j2");
  assert.equal(state?.verdict, "not_kept");
  assert.equal(state?.appealed, false);
});

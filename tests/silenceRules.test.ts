import assert from "node:assert/strict";
import test from "node:test";

import { autoConfirmDate, autoConfirmDue, expectedAutoConfirmAt, finalNoticeDue } from "../src/lib/promises/silenceRules";

// A promise marked done and left without an answer: final reminder on day 10, counted on day 14; one
// that hung long before gets the reminder and then a week.

const done = "2026-11-01T10:00:00.000Z";
const at = (iso: string) => new Date(iso);

test("the final reminder is due from day 10, once", () => {
  const state = { completedAt: done, finalNoticeAt: null, autoConfirmAt: null };
  assert.equal(finalNoticeDue(state, at("2026-11-11T09:59:00Z")), false);
  assert.equal(finalNoticeDue(state, at("2026-11-11T10:00:00Z")), true);
  assert.equal(finalNoticeDue({ ...state, finalNoticeAt: "2026-11-11T10:00:00Z" }, at("2026-11-20T00:00:00Z")), false);
  assert.equal(finalNoticeDue({ ...state, completedAt: null }, at("2027-01-01T00:00:00Z")), false);
});

test("the promised date is day 14, at least 3 days after the reminder; a week for an old promise", () => {
  assert.equal(autoConfirmDate(done, at("2026-11-11T10:00:00Z")).toISOString(), "2026-11-15T10:00:00.000Z");
  assert.equal(autoConfirmDate(done, at("2026-11-12T09:00:00Z")).toISOString(), "2026-11-15T10:00:00.000Z");
  assert.equal(autoConfirmDate("2026-03-01T09:18:00Z", at("2026-11-10T08:00:00Z")).toISOString(), "2026-11-17T08:00:00.000Z");
});

test("counted only after the reminder went out and its date came", () => {
  const sent = { completedAt: done, finalNoticeAt: "2026-11-11T10:00:00Z", autoConfirmAt: "2026-11-15T10:00:00Z" };
  assert.equal(autoConfirmDue(sent, at("2026-11-15T09:59:00Z")), false);
  assert.equal(autoConfirmDue(sent, at("2026-11-15T10:00:00Z")), true);
  assert.equal(autoConfirmDue({ ...sent, finalNoticeAt: null }, at("2027-01-01T00:00:00Z")), false);
});

test("the page shows the promised date, or the one the reminder will promise", () => {
  const early = at("2026-11-03T00:00:00Z");
  assert.equal(expectedAutoConfirmAt({ completedAt: done, finalNoticeAt: null, autoConfirmAt: null }, early), "2026-11-15T10:00:00.000Z");
  // Hanging since March, no reminder yet: a week from now, never a date in the past.
  assert.equal(
    expectedAutoConfirmAt({ completedAt: "2026-03-01T09:18:00Z", finalNoticeAt: null, autoConfirmAt: null }, at("2026-11-09T12:00:00Z")),
    "2026-11-16T12:00:00.000Z"
  );
  assert.equal(
    expectedAutoConfirmAt({ completedAt: done, finalNoticeAt: "x", autoConfirmAt: "2026-11-17T08:00:00.000Z" }),
    "2026-11-17T08:00:00.000Z"
  );
  assert.equal(expectedAutoConfirmAt({ completedAt: null, finalNoticeAt: null, autoConfirmAt: null }), null);
});


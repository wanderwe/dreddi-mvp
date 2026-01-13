import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCompletionFollowupStage,
  isDailyCapExceeded,
  isPerDealCapExceeded,
  isWithinQuietHours,
} from "../src/lib/notifications/policy";
import { buildDedupeKey } from "../src/lib/notifications/service";

const dateAt = (iso: string) => new Date(iso);

describe("notification policy", () => {
  it("detects quiet hours across midnight", () => {
    assert.equal(
      isWithinQuietHours(dateAt("2024-01-01T23:15:00Z"), {
        enabled: true,
        start: "22:00",
        end: "09:00",
      }),
      true
    );

    assert.equal(
      isWithinQuietHours(dateAt("2024-01-02T08:30:00Z"), {
        enabled: true,
        start: "22:00",
        end: "09:00",
      }),
      true
    );

    assert.equal(
      isWithinQuietHours(dateAt("2024-01-02T12:30:00Z"), {
        enabled: true,
        start: "22:00",
        end: "09:00",
      }),
      false
    );

    assert.equal(
      isWithinQuietHours(dateAt("2024-01-02T12:30:00Z"), {
        enabled: false,
        start: "22:00",
        end: "09:00",
      }),
      false
    );
  });

  it("enforces daily cap only for non-critical types", () => {
    assert.equal(isDailyCapExceeded(3, "N1"), true);
    assert.equal(isDailyCapExceeded(2, "N1"), false);
    assert.equal(isDailyCapExceeded(10, "N5"), false);
  });

  it("enforces per-deal cap for non-critical types", () => {
    const now = dateAt("2024-01-02T12:00:00Z");
    const recent = dateAt("2024-01-02T06:00:00Z");
    const old = dateAt("2024-01-01T06:00:00Z");

    assert.equal(isPerDealCapExceeded(recent, now, "N1"), true);
    assert.equal(isPerDealCapExceeded(old, now, "N1"), false);
    assert.equal(isPerDealCapExceeded(recent, now, "N5"), false);
  });

  it("chooses correct completion follow-up stage", () => {
    const base = dateAt("2024-01-02T12:00:00Z");
    assert.equal(
      getCompletionFollowupStage(dateAt("2024-01-01T11:00:00Z"), 0, base),
      "24h"
    );
    assert.equal(
      getCompletionFollowupStage(dateAt("2024-01-01T11:00:00Z"), 1, base),
      null
    );
    assert.equal(
      getCompletionFollowupStage(dateAt("2023-12-30T08:00:00Z"), 1, base),
      "72h"
    );
  });
});

describe("notification dedupe keys", () => {
  it("builds consistent dedupe keys", () => {
    assert.equal(buildDedupeKey(["N1", "promise", 1]), "N1:promise:1");
    assert.equal(buildDedupeKey(["N5", "promise", "followup"]), "N5:promise:followup");
  });
});

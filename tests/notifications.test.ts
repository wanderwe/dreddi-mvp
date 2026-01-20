import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCompletionFollowupStage,
  isDailyCapExceeded,
  isPerDealCapExceeded,
  isWithinQuietHours,
} from "../src/lib/notifications/policy";
import { buildDedupeKey } from "../src/lib/notifications/service";
import { getInviteResponseCopy } from "../src/lib/notifications/inviteResponses";

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
    assert.equal(isDailyCapExceeded(3, "invite"), true);
    assert.equal(isDailyCapExceeded(2, "invite"), false);
    assert.equal(isDailyCapExceeded(10, "completion_waiting"), false);
  });

  it("enforces per-deal cap for non-critical types", () => {
    const now = dateAt("2024-01-02T12:00:00Z");
    const recent = dateAt("2024-01-02T06:00:00Z");
    const old = dateAt("2024-01-01T06:00:00Z");

    assert.equal(isPerDealCapExceeded(recent, now, "invite"), true);
    assert.equal(isPerDealCapExceeded(old, now, "invite"), false);
    assert.equal(isPerDealCapExceeded(recent, now, "completion_waiting"), false);
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
    assert.equal(buildDedupeKey(["invite", "promise", 1]), "invite:promise:1");
    assert.equal(
      buildDedupeKey(["completion_waiting", "promise", "followup"]),
      "completion_waiting:promise:followup"
    );
  });
});

describe("invite response notifications", () => {
  it("builds decline copy in English", () => {
    const copy = getInviteResponseCopy({
      locale: "en",
      response: "declined",
      actorName: "@alex",
      dealTitle: "Design sprint",
    });

    assert.equal(copy.title, "Invite declined");
    assert.equal(copy.body, "@alex declined the invite to the deal: Design sprint");
    assert.equal(copy.ctaLabel, "Open deal");
  });

  it("builds ignore copy in Ukrainian", () => {
    const copy = getInviteResponseCopy({
      locale: "uk",
      response: "ignored",
      actorName: "@olena",
      dealTitle: "UX аудит",
    });

    assert.equal(copy.title, "Запрошення без відповіді");
    assert.equal(copy.body, "@olena поки що не відповів(ла) на запрошення до угоди: UX аудит");
    assert.equal(copy.ctaLabel, "Відкрити угоду");
  });
});

import assert from "node:assert/strict";
import test from "node:test";

import { formatDue, formatRoleHint } from "../src/lib/dealList";
import { createTranslator } from "../src/lib/i18n/t";
import { getMessages } from "../src/lib/i18n/getMessages";

test("formatDue omits time for date-only precision", () => {
  const t = createTranslator("en", getMessages("en"));
  const dueAt = new Date("2025-01-17T12:00:00.000Z").toISOString();
  const result = formatDue({ dueAt, precision: "date", locale: "en", t });

  assert.ok(result?.startsWith("Due"));
  assert.equal(/\d{1,2}:\d{2}/.test(result ?? ""), false);
});

test("formatRoleHint returns responsible vs promised for viewer", () => {
  const t = createTranslator("en", getMessages("en"));

  assert.equal(
    formatRoleHint({
      viewerUserId: "user-1",
      creatorId: "creator-1",
      executorId: "user-1",
      t,
    }),
    "You’re responsible"
  );

  assert.equal(
    formatRoleHint({
      viewerUserId: "creator-1",
      creatorId: "creator-1",
      executorId: "executor-1",
      t,
    }),
    "Promised to you"
  );
});

test("deal list translations exist in en and uk", () => {
  const tEn = createTranslator("en", getMessages("en"));
  const tUk = createTranslator("uk", getMessages("uk"));

  assert.equal(tEn("dealList.duePrefix"), "Due");
  assert.equal(tUk("dealList.duePrefix"), "Строк");
  assert.equal(tEn("dealList.role.responsible"), "You’re responsible");
  assert.equal(tUk("dealList.role.responsible"), "Ви відповідальні");
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("public profile track record card keeps legacy monthly pace + activity format", () => {
  const pageSource = readFileSync("src/app/u/[handle]/page.tsx", "utf8");

  assert.match(
    pageSource,
    /trackRecord\.perMonthValue/,
    "track record card should render perMonthValue as the main metric"
  );
  assert.match(
    pageSource,
    /trackRecord\.activeDays/,
    "track record card should render activeDays as the caption"
  );

  assert.doesNotMatch(pageSource, /trackRecord\.summary/);
  assert.doesNotMatch(pageSource, /trackRecord\.compact/);
  assert.doesNotMatch(pageSource, /paceWindowDays/);
  assert.doesNotMatch(pageSource, /dealsLast30d/);

  const ukMessages = JSON.parse(readFileSync("src/messages/uk.json", "utf8"));
  const enMessages = JSON.parse(readFileSync("src/messages/en.json", "utf8"));

  assert.equal(
    ukMessages.publicProfile.reputationDetails.trackRecord.perMonthValue,
    "{count} / місяць"
  );
  assert.equal(
    ukMessages.publicProfile.reputationDetails.trackRecord.activeDays,
    "активність {count} {label}"
  );
  assert.equal(
    enMessages.publicProfile.reputationDetails.trackRecord.perMonthValue,
    "{count} / month"
  );
  assert.equal(
    enMessages.publicProfile.reputationDetails.trackRecord.activeDays,
    "active {count} {label}"
  );
});

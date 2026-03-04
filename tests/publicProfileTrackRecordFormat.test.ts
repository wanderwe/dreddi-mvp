import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("public profile track record card renders pace value with secondary per-month unit and active-days caption", () => {
  const pageSource = readFileSync("src/app/u/[handle]/page.tsx", "utf8");

  assert.match(
    pageSource,
    /trackRecord\.perMonthUnit/,
    "track record card should render perMonthUnit as secondary text"
  );
  assert.match(
    pageSource,
    /trackRecord\.activeDays/,
    "track record card should render activeDays as the caption"
  );
  assert.match(
    pageSource,
    /paceFormatter\.format\(reputationEvidence\.pace\)/,
    "track record card should render pace as the main numeric value"
  );

  assert.doesNotMatch(pageSource, /trackRecord\.summary/);
  assert.doesNotMatch(pageSource, /trackRecord\.compact/);
  assert.doesNotMatch(pageSource, /deals30d/);
  assert.doesNotMatch(pageSource, /activeDays30d/);

  const ukMessages = JSON.parse(readFileSync("src/messages/uk.json", "utf8"));
  const enMessages = JSON.parse(readFileSync("src/messages/en.json", "utf8"));

  assert.equal(ukMessages.publicProfile.reputationDetails.trackRecord.perMonthUnit, "/ місяць");
  assert.equal(ukMessages.publicProfile.reputationDetails.trackRecord.activeDays, "активність {count} днів");
  assert.equal(enMessages.publicProfile.reputationDetails.trackRecord.perMonthUnit, "/ month");
  assert.equal(enMessages.publicProfile.reputationDetails.trackRecord.activeDays, "active {count} days");
});

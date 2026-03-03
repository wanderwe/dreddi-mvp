import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

type Labels = Record<string, Record<string, string>>;

type Messages = {
  publicProfile: {
    reputationDetails: {
      workedWith: { secondary: string };
      trackRecord: {
        summary: string;
        insufficientData: string;
      };
      labels: Labels;
    };
  };
};

const readMessages = (locale: "uk" | "en"): Messages => {
  const filePath = path.join(process.cwd(), "src", "messages", `${locale}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Messages;
};

const formatPlural = (locale: "uk" | "en", count: number, forms: Record<string, string>) => {
  const rule = new Intl.PluralRules(locale).select(count);
  return forms[rule] ?? forms.other;
};

const interpolate = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);

test("UA collaboration secondary line keeps legacy wording and grammatical forms", () => {
  const uk = readMessages("uk");
  const template = uk.publicProfile.reputationDetails.workedWith.secondary;
  const forms = uk.publicProfile.reputationDetails.labels.dealsTotal;

  const one = interpolate(template, {
    count: "1",
    label: formatPlural("uk", 1, forms),
  });
  const few = interpolate(template, {
    count: "2",
    label: formatPlural("uk", 2, forms),
  });
  const many = interpolate(template, {
    count: "5",
    label: formatPlural("uk", 5, forms),
  });

  assert.equal(one, "з 1 угоди");
  assert.equal(few, "з 2 угод");
  assert.equal(many, "з 5 угод");
});

test("Track record summary interpolation keys are concrete and never render raw placeholders", () => {
  const uk = readMessages("uk");
  const summaryTemplate = uk.publicProfile.reputationDetails.trackRecord.summary;

  const rendered = interpolate(summaryTemplate, {
    dealsCount: "4",
    dealsLabel: formatPlural("uk", 4, uk.publicProfile.reputationDetails.labels.deals),
    daysCount: "30",
    daysLabel: formatPlural("uk", 30, uk.publicProfile.reputationDetails.labels.days),
  });

  assert.equal(rendered, "4 угоди за 30 днів");
  assert.equal(uk.publicProfile.reputationDetails.trackRecord.insufficientData, "Недостатньо даних");
  assert.ok(!rendered.includes("{"));
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stripTrailingPeriod } from "../src/lib/text";

describe("stripTrailingPeriod", () => {
  it("removes a trailing period for single-sentence copy", () => {
    assert.equal(
      stripTrailingPeriod("Sign in to create deals and track reputation."),
      "Sign in to create deals and track reputation"
    );
  });

  it("keeps periods for multi-sentence copy", () => {
    assert.equal(
      stripTrailingPeriod("Agreement marked completed. Confirm or dispute."),
      "Agreement marked completed. Confirm or dispute."
    );
  });

  it("keeps ellipses and other punctuation", () => {
    assert.equal(stripTrailingPeriod("Processing..."), "Processing...");
    assert.equal(stripTrailingPeriod("Ready to go!"), "Ready to go!");
  });
});

import assert from "node:assert/strict";
import test from "node:test";
import { generateDealPrediction } from "../src/lib/prediction/dealPrediction";

test("strong profile with clear public deal gives high score", () => {
  const result = generateDealPrediction({
    actorMetrics: {
      fulfilledRate: 92,
      completionRate: 91,
      disputeRate: 4,
      finalizedDealsCount: 28,
    },
    deal: {
      hasDeadline: true,
      hoursToDeadline: 96,
      isPublic: true,
      detailsText: "- Ship by Friday\n- Include tests and release notes",
    },
  });

  assert.equal(result.band, "strong");
  assert.ok(result.score >= 80);
});

test("weak completion, high disputes, vague deal and no deadline gives low score", () => {
  const result = generateDealPrediction({
    actorMetrics: {
      fulfilledRate: 35,
      completionRate: 38,
      disputeRate: 34,
      finalizedDealsCount: 4,
    },
    deal: {
      hasDeadline: false,
      isPublic: false,
      detailsText: "Do it",
    },
  });

  assert.equal(result.band, "very_high_risk");
  assert.ok(result.score <= 24);
});

test("new user gets moderate score with limited history reason", () => {
  const result = generateDealPrediction({
    actorMetrics: {
      finalizedDealsCount: 1,
    },
    deal: {
      hasDeadline: true,
      hoursToDeadline: 120,
      isPublic: false,
      detailsText: "Build landing page and send draft by next week.",
    },
  });

  assert.equal(result.band, "moderate");
  assert.ok(result.reasons.some((reason) => reason.includes("limited history")));
});

test("shared fulfilled history with same counterparty increases score", () => {
  const withoutHistory = generateDealPrediction({
    actorMetrics: {
      fulfilledRate: 76,
      completionRate: 78,
      disputeRate: 8,
      finalizedDealsCount: 14,
    },
    counterpartyMetrics: {
      priorFulfilledTogether: 0,
      isPublicProfile: true,
      responseRate: 84,
    },
    deal: {
      hasDeadline: true,
      hoursToDeadline: 120,
      isPublic: false,
      detailsText: "Detailed scope and deliverables included here to avoid ambiguity.",
    },
  });

  const withHistory = generateDealPrediction({
    actorMetrics: {
      fulfilledRate: 76,
      completionRate: 78,
      disputeRate: 8,
      finalizedDealsCount: 14,
    },
    counterpartyMetrics: {
      priorFulfilledTogether: 3,
      isPublicProfile: true,
      responseRate: 84,
    },
    deal: {
      hasDeadline: true,
      hoursToDeadline: 120,
      isPublic: false,
      detailsText: "Detailed scope and deliverables included here to avoid ambiguity.",
    },
  });

  assert.ok(withHistory.score > withoutHistory.score);
});

test("very short deadline applies clear penalty", () => {
  const normal = generateDealPrediction({
    deal: {
      hasDeadline: true,
      hoursToDeadline: 100,
      isPublic: false,
      detailsText: "Write complete scope for this agreement with milestones and checks.",
    },
  });
  const aggressive = generateDealPrediction({
    deal: {
      hasDeadline: true,
      hoursToDeadline: 8,
      isPublic: false,
      detailsText: "Write complete scope for this agreement with milestones and checks.",
    },
  });

  assert.ok(aggressive.score <= normal.score - 10);
});

test("reasons avoid duplicated actor history wording", () => {
  const result = generateDealPrediction({
    actorMetrics: {
      fulfilledRate: 96,
      completionRate: 93,
      disputeRate: 2,
      finalizedDealsCount: 30,
    },
    deal: {
      hasDeadline: false,
      isPublic: false,
      detailsText: "Do it",
    },
  });

  const historyReasonCount = result.reasonKeys.filter((key) =>
    ["strong_fulfillment_history", "strong_completion_history"].includes(key)
  ).length;

  assert.equal(historyReasonCount, 1);
});

test("dispute rate at exactly 10% does not trigger dispute risk reason", () => {
  const result = generateDealPrediction({
    actorMetrics: {
      fulfilledRate: 90,
      completionRate: 90,
      disputeRate: 10,
      finalizedDealsCount: 10,
    },
    deal: {
      hasDeadline: true,
      hoursToDeadline: 96,
      isPublic: false,
      detailsText: "Detailed description with enough context to be clear for both sides.",
    },
  });

  assert.ok(!result.reasonKeys.includes("high_dispute_rate"));
});

test("dispute rate below 20% does not trigger dispute risk reason", () => {
  const result = generateDealPrediction({
    actorMetrics: {
      fulfilledRate: 88,
      completionRate: 84,
      disputeRate: 12.5,
      finalizedDealsCount: 8,
    },
    deal: {
      hasDeadline: true,
      hoursToDeadline: 96,
      isPublic: false,
      detailsText: "Detailed description with enough context to be clear for both sides.",
    },
  });

  assert.ok(!result.reasonKeys.includes("high_dispute_rate"));
});

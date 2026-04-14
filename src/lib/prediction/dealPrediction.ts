export type PredictionInput = {
  actorMetrics?: {
    fulfilledRate?: number;
    completionRate?: number;
    disputeRate?: number;
    finalizedDealsCount?: number;
  };
  counterpartyMetrics?: {
    responseRate?: number;
    priorFulfilledTogether?: number;
    isPublicProfile?: boolean;
  };
  deal?: {
    hasDeadline: boolean;
    hoursToDeadline?: number | null;
    isPublic: boolean;
    detailsText?: string | null;
  };
};

export type PredictionBand = "strong" | "good" | "moderate" | "high_risk" | "very_high_risk";

export type PredictionReasonKey =
  | "strong_fulfillment_history"
  | "low_fulfillment_history"
  | "strong_completion_history"
  | "low_completion_history"
  | "high_dispute_rate"
  | "limited_history_uncertain"
  | "deep_shared_history"
  | "some_shared_history"
  | "new_counterparty"
  | "counterparty_responsive"
  | "counterparty_unresponsive"
  | "has_deadline"
  | "no_deadline"
  | "short_deadline_risk"
  | "clear_details"
  | "unclear_details"
  | "public_commitment";

export type AppliedModifier = {
  key: string;
  delta: number;
  reasonKey: PredictionReasonKey;
};

export type PredictionResult = {
  score: number;
  band: PredictionBand;
  reasons: string[];
  reasonKeys: PredictionReasonKey[];
  appliedModifiers: AppliedModifier[];
};

const BASE_SCORE = 70;
const MIN_SCORE = 5;
const MAX_SCORE = 95;

const EN_REASONS: Record<PredictionReasonKey, string> = {
  strong_fulfillment_history: "strong fulfillment history",
  low_fulfillment_history: "low fulfillment history increases risk",
  strong_completion_history: "strong completion history lowers risk",
  low_completion_history: "low completion history increases risk",
  high_dispute_rate: "high dispute rate increases risk",
  limited_history_uncertain: "limited history makes this prediction less certain",
  deep_shared_history: "you have successful history with this person",
  some_shared_history: "you have fulfilled deals together",
  new_counterparty: "this is a new counterparty with no shared history",
  counterparty_responsive: "this counterparty usually responds to deal outcomes",
  counterparty_unresponsive: "this counterparty often does not respond to deal outcomes",
  has_deadline: "a clear deadline improves clarity",
  no_deadline: "no deadline makes outcome less clear",
  short_deadline_risk: "short deadline increases risk",
  clear_details: "clear deal details improve clarity",
  unclear_details: "unclear deal details increase ambiguity",
  public_commitment: "public commitment adds accountability",
};

const REASON_TOPIC: Record<PredictionReasonKey, string> = {
  strong_fulfillment_history: "actor_track_record",
  low_fulfillment_history: "actor_track_record",
  strong_completion_history: "actor_track_record",
  low_completion_history: "actor_track_record",
  high_dispute_rate: "disputes",
  limited_history_uncertain: "certainty",
  deep_shared_history: "relationship",
  some_shared_history: "relationship",
  new_counterparty: "relationship",
  counterparty_responsive: "counterparty_responsiveness",
  counterparty_unresponsive: "counterparty_responsiveness",
  has_deadline: "deadline_clarity",
  no_deadline: "deadline_clarity",
  short_deadline_risk: "deadline_pressure",
  clear_details: "details_quality",
  unclear_details: "details_quality",
  public_commitment: "public_accountability",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildDetailsQuality(detailsText?: string | null) {
  const text = (detailsText ?? "").trim();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 12);
  const hasBullet = /^\s*[-*•]\s+/.test(text) || /^\s*\d+[.)]\s+/.test(text);

  if (text.length < 40) {
    return { delta: -6, reasonKey: "unclear_details" as const };
  }

  if (lines.length >= 2 || hasBullet || text.length > 140) {
    return { delta: +5, reasonKey: "clear_details" as const };
  }

  return { delta: +2, reasonKey: "clear_details" as const };
}

function getBand(score: number): PredictionBand {
  if (score >= 80) return "strong";
  if (score >= 65) return "good";
  if (score >= 45) return "moderate";
  if (score >= 25) return "high_risk";
  return "very_high_risk";
}

function pickReasons(modifiers: AppliedModifier[]) {
  const nonZero = modifiers.filter((item) => item.delta !== 0);
  const positives = nonZero
    .filter((item) => item.delta > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const negatives = nonZero
    .filter((item) => item.delta < 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const selected: AppliedModifier[] = [];
  const selectedTopics = new Set<string>();
  const tryPush = (item: AppliedModifier) => {
    const topic = REASON_TOPIC[item.reasonKey];
    if (selectedTopics.has(topic)) return false;
    selected.push(item);
    selectedTopics.add(topic);
    return true;
  };

  if (positives.length > 0) tryPush(positives[0]);
  if (negatives.length > 0) tryPush(negatives[0]);

  const rest = nonZero
    .filter((item) => !selected.includes(item))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  for (const item of rest) {
    if (selected.length >= 4) break;
    tryPush(item);
  }

  if (selected.length < 2) {
    const fallback = modifiers.find((item) => item.reasonKey === "limited_history_uncertain");
    if (fallback) selected.push(fallback);
  }

  return selected.slice(0, 4);
}

export function generateDealPrediction(input: PredictionInput): PredictionResult {
  const modifiers: AppliedModifier[] = [];
  const actor = input.actorMetrics;
  const counterparty = input.counterpartyMetrics;
  const deal = input.deal;

  const addModifier = (key: string, delta: number, reasonKey: PredictionReasonKey) => {
    modifiers.push({ key, delta, reasonKey });
  };

  if (typeof actor?.fulfilledRate === "number") {
    if (actor.fulfilledRate >= 90) addModifier("actor_fulfilled_rate", 10, "strong_fulfillment_history");
    else if (actor.fulfilledRate >= 75) addModifier("actor_fulfilled_rate", 6, "strong_fulfillment_history");
    else if (actor.fulfilledRate >= 60) addModifier("actor_fulfilled_rate", 2, "strong_fulfillment_history");
    else if (actor.fulfilledRate >= 40) addModifier("actor_fulfilled_rate", -6, "low_fulfillment_history");
    else addModifier("actor_fulfilled_rate", -12, "low_fulfillment_history");
  }

  if (typeof actor?.completionRate === "number") {
    if (actor.completionRate >= 90) addModifier("actor_completion_rate", 8, "strong_completion_history");
    else if (actor.completionRate >= 75) addModifier("actor_completion_rate", 4, "strong_completion_history");
    else if (actor.completionRate >= 60) addModifier("actor_completion_rate", 0, "strong_completion_history");
    else if (actor.completionRate >= 40) addModifier("actor_completion_rate", -6, "low_completion_history");
    else addModifier("actor_completion_rate", -10, "low_completion_history");
  }

  if (typeof actor?.disputeRate === "number") {
    if (actor.disputeRate >= 30) addModifier("actor_dispute_rate", -12, "high_dispute_rate");
    else if (actor.disputeRate >= 20) addModifier("actor_dispute_rate", -8, "high_dispute_rate");
    else if (actor.disputeRate > 10) addModifier("actor_dispute_rate", -4, "high_dispute_rate");
    else addModifier("actor_dispute_rate", 0, "high_dispute_rate");
  }

  if (typeof actor?.finalizedDealsCount === "number") {
    if (actor.finalizedDealsCount < 3) addModifier("actor_volume_confidence", -4, "limited_history_uncertain");
    else if (actor.finalizedDealsCount <= 5) addModifier("actor_volume_confidence", -2, "limited_history_uncertain");
    else if (actor.finalizedDealsCount > 20) addModifier("actor_volume_confidence", 2, "strong_fulfillment_history");
  }

  if (typeof counterparty?.priorFulfilledTogether === "number") {
    if (counterparty.priorFulfilledTogether >= 3) addModifier("counterparty_prior_fulfilled_together", 8, "deep_shared_history");
    else if (counterparty.priorFulfilledTogether >= 1) addModifier("counterparty_prior_fulfilled_together", 4, "some_shared_history");
    else addModifier("counterparty_prior_fulfilled_together", -3, "new_counterparty");
  }

  if (counterparty?.isPublicProfile && typeof counterparty.responseRate === "number") {
    if (counterparty.responseRate >= 90) addModifier("counterparty_response_rate", 4, "counterparty_responsive");
    else if (counterparty.responseRate >= 70) addModifier("counterparty_response_rate", 2, "counterparty_responsive");
    else if (counterparty.responseRate >= 40) addModifier("counterparty_response_rate", -3, "counterparty_unresponsive");
    else addModifier("counterparty_response_rate", -7, "counterparty_unresponsive");
  }

  if (deal) {
    addModifier("deal_deadline_presence", deal.hasDeadline ? 2 : -6, deal.hasDeadline ? "has_deadline" : "no_deadline");

    if (deal.hasDeadline && typeof deal.hoursToDeadline === "number") {
      if (deal.hoursToDeadline < 24) addModifier("deal_deadline_aggressiveness", -12, "short_deadline_risk");
      else if (deal.hoursToDeadline < 72) addModifier("deal_deadline_aggressiveness", -6, "short_deadline_risk");
      else if (deal.hoursToDeadline <= 168) addModifier("deal_deadline_aggressiveness", -2, "short_deadline_risk");
      else if (deal.hoursToDeadline <= 720) addModifier("deal_deadline_aggressiveness", 2, "has_deadline");
    }

    const details = buildDetailsQuality(deal.detailsText);
    addModifier("deal_details_quality", details.delta, details.reasonKey);

    if (deal.isPublic) addModifier("deal_public_commitment", 3, "public_commitment");
  }

  const hasSparseActorData = !actor || [actor.fulfilledRate, actor.completionRate, actor.disputeRate].filter((value) => typeof value === "number").length < 2;

  if (hasSparseActorData && !modifiers.some((item) => item.reasonKey === "limited_history_uncertain")) {
    addModifier("insufficient_history", -4, "limited_history_uncertain");
  }

  const totalDelta = modifiers.reduce((sum, item) => sum + item.delta, 0);
  const score = Math.round(clamp(BASE_SCORE + totalDelta, MIN_SCORE, MAX_SCORE));
  const band = getBand(score);
  const topReasons = pickReasons(modifiers);

  return {
    score,
    band,
    reasons: topReasons.map((item) => EN_REASONS[item.reasonKey]),
    reasonKeys: topReasons.map((item) => item.reasonKey),
    appliedModifiers: modifiers,
  };
}

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  AutoSchema,
  CriteriaSchema,
  JUDGE_MODEL,
  TONE_RULES,
  ToneSchema,
  VerdictSchema,
  buildToneMessages,
  buildJudgeMessages,
  buildSystemPrompt,
  estimateCostUsd,
  type AutoResult,
  type CriteriaResult,
  type JudgeMode,
  type JudgePromise,
  type JudgeTurn,
  type ToneResult,
  type VerdictResult,
} from "./judge";

// Server only: one call to the AI judge, shared by the lab page and real promises.

export class JudgeError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const isParseFailure = (error: unknown) =>
  error instanceof Error && error.message.includes("Failed to parse structured output");

export type JudgeAnswer<P extends JudgeMode> = {
  result: P extends "criteria" ? CriteriaResult : P extends "verdict" ? VerdictResult : AutoResult;
  model: string;
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
};

const noLongDashes = (text: string) => text.replace(/\s*—\s*/g, ", ");
// Criteria are single short lines, and single lines carry no closing period in Dreddi.
const noClosingPeriod = (line: string) => line.trim().replace(/(?<!\.)\.$/, "");
// The ids (C1, M2) are for criteria_check only; one that slips into text people read is dropped.
export const noIds = (text: string) =>
  text
    .replace(/(?<![A-Z]{2,}\s*)\s*\(?(?<![\p{L}\d])(?:за\s+)?(?:критері\p{L}*\s+)?[CM]\d+(?:\s*(?:,|і|та|and)\s*[CM]\d+)*(?![\p{L}\d])\)?/gu, "")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
// Criteria carry ids (C1) in the prompt; a new version must not copy them into its own lines.
const noCriterionId = (line: string) => line.replace(/^\s*C\d+[.:)]\s*/, "");

export async function askJudge<P extends JudgeMode>({
  phase,
  promise,
  turns,
}: {
  phase: P;
  promise: JudgePromise;
  turns: JudgeTurn[];
}): Promise<JudgeAnswer<P>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new JudgeError("Add ANTHROPIC_API_KEY to .env.local and restart", 500);
  }

  const client = new Anthropic();
  const schema = phase === "criteria" ? CriteriaSchema : phase === "verdict" ? VerdictSchema : AutoSchema;

  const request = {
    model: JUDGE_MODEL,
    max_tokens: 4000,
    system: buildSystemPrompt(phase),
    messages: buildJudgeMessages(turns, promise) as Anthropic.MessageParam[],
    output_config: { effort: "medium" as const, format: zodOutputFormat(schema) },
  };

  try {
    // An answer that does not match the schema is rare and random: one more try usually fixes it.
    const response = await client.messages.parse(request).catch((error: unknown) => {
      if (!isParseFailure(error)) throw error;
      return client.messages.parse(request);
    });

    if (response.stop_reason === "refusal") throw new JudgeError("The model declined to answer", 422);
    if (!response.parsed_output) {
      throw new JudgeError(`No structured answer (stop: ${response.stop_reason})`, 502);
    }

    const { input_tokens: inputTokens, output_tokens: outputTokens } = response.usage;
    // The prompt bans long dashes, but a cheap model still slips one in now and then.
    const parsed = response.parsed_output;
    const result = {
      ...parsed,
      reply: noIds(noLongDashes(parsed.reply)),
      ...("criteria" in parsed && Array.isArray(parsed.criteria)
        ? { criteria: parsed.criteria.map((line: string) => noClosingPeriod(noLongDashes(noCriterionId(line)))) }
        : {}),
      ...("reasons" in parsed && Array.isArray(parsed.reasons)
        ? { reasons: parsed.reasons.map((line: string) => noIds(noLongDashes(line))) }
        : {}),
      // The schema cannot bound a number, so the 0 to 1 range is kept here.
      ...("confidence" in parsed ? { confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)) } : {}),
    };
    return {
      result: result as JudgeAnswer<P>["result"],
      model: response.model,
      usage: { inputTokens, outputTokens, costUsd: estimateCostUsd(inputTokens, outputTokens) },
    };
  } catch (error) {
    throw toJudgeError(error);
  }
}

// The SDK's errors as JudgeErrors the routes can answer with.
const toJudgeError = (error: unknown) => {
  if (error instanceof JudgeError) return error;
  if (error instanceof Anthropic.AuthenticationError) return new JudgeError("No valid ANTHROPIC_API_KEY in .env.local", 500);
  if (error instanceof Anthropic.RateLimitError) return new JudgeError("Rate limited, try again in a minute", 429);
  if (error instanceof Anthropic.APIConnectionError) return new JudgeError("Could not reach the Claude API", 502);
  if (error instanceof Anthropic.APIError) return new JudgeError(`Claude API error ${error.status}: ${error.message}`, 502);
  if (isParseFailure(error)) return new JudgeError("Dreddi's answer came out garbled, try again", 502);
  return error;
};

// A calmer version of a message a side is about to send. Only a suggestion: the side picks what goes out.
export async function askTone(draft: string): Promise<ToneResult & { costUsd: number }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new JudgeError("Add ANTHROPIC_API_KEY to .env.local and restart", 500);
  }
  try {
    const response = await new Anthropic().messages.parse({
      model: JUDGE_MODEL,
      max_tokens: 2000,
      system: TONE_RULES,
      messages: buildToneMessages(draft) as Anthropic.MessageParam[],
      output_config: { effort: "medium" as const, format: zodOutputFormat(ToneSchema) },
    });
    const parsed = response.parsed_output;
    const { input_tokens: inputTokens, output_tokens: outputTokens } = response.usage;
    const costUsd = estimateCostUsd(inputTokens, outputTokens);
    if (!parsed) return { text: draft, changed: false, costUsd };
    const text = noLongDashes(parsed.text).trim();
    return { text, changed: parsed.changed && text.length > 0 && text !== draft.trim(), costUsd };
  } catch (error) {
    throw toJudgeError(error);
  }
}

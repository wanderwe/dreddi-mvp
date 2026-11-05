import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  AutoSchema,
  CriteriaSchema,
  JUDGE_MODEL,
  VerdictSchema,
  buildSystemPrompt,
  estimateCostUsd,
  type AutoResult,
  type CriteriaResult,
  type JudgeMode,
  type JudgePromise,
  type JudgeTurn,
  type VerdictResult,
} from "@/lib/ai/judge";

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

const SPEAKER_LABEL = { promisor: "Promisor", counterparty: "Counterparty" } as const;

const toMessages = (turns: JudgeTurn[]): Anthropic.MessageParam[] =>
  turns.map((turn) => {
    if (turn.role === "assistant") return { role: "assistant", content: turn.text };
    const label = turn.label ?? SPEAKER_LABEL[turn.speaker ?? "promisor"];
    const notes = turn.evidenceNotes?.length
      ? `\n(Evidence shown with this message, as you noted then: ${turn.evidenceNotes.join("; ")})`
      : "";
    const content: Anthropic.ContentBlockParam[] = [
      ...(turn.images ?? []).map(
        (image): Anthropic.ImageBlockParam => ({
          type: "image",
          source: { type: "base64", media_type: image.mediaType, data: image.data },
        })
      ),
      { type: "text", text: `[${label}] ${turn.text || "(no text, see the attached evidence)"}${notes}` },
    ];
    return { role: "user", content };
  });

export type JudgeAnswer<P extends JudgeMode> = {
  result: P extends "criteria" ? CriteriaResult : P extends "verdict" ? VerdictResult : AutoResult;
  model: string;
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
};

const noLongDashes = (text: string) => text.replace(/\s*—\s*/g, ", ");
// Criteria are single short lines, and single lines carry no closing period in Dreddi.
const noClosingPeriod = (line: string) => line.trim().replace(/(?<!\.)\.$/, "");

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
    system: buildSystemPrompt(phase, promise),
    messages: toMessages(turns),
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
      reply: noLongDashes(parsed.reply),
      ...("criteria" in parsed && Array.isArray(parsed.criteria)
        ? { criteria: parsed.criteria.map((line: string) => noClosingPeriod(noLongDashes(line))) }
        : {}),
    };
    return {
      result: result as JudgeAnswer<P>["result"],
      model: response.model,
      usage: { inputTokens, outputTokens, costUsd: estimateCostUsd(inputTokens, outputTokens) },
    };
  } catch (error) {
    if (error instanceof JudgeError) throw error;
    if (error instanceof Anthropic.AuthenticationError) {
      throw new JudgeError("No valid ANTHROPIC_API_KEY in .env.local", 500);
    }
    if (error instanceof Anthropic.RateLimitError) throw new JudgeError("Rate limited, try again in a minute", 429);
    if (error instanceof Anthropic.APIConnectionError) throw new JudgeError("Could not reach the Claude API", 502);
    if (error instanceof Anthropic.APIError) {
      throw new JudgeError(`Claude API error ${error.status}: ${error.message}`, 502);
    }
    if (isParseFailure(error)) throw new JudgeError("Dreddi's answer came out garbled, try again", 502);
    throw error;
  }
}

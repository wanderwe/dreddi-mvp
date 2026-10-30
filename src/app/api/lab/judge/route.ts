import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import {
  CriteriaSchema,
  JUDGE_MODEL,
  VerdictSchema,
  buildSystemPrompt,
  estimateCostUsd,
  type JudgePhase,
  type JudgeStyle,
  type JudgePromise,
  type JudgeTurn,
} from "@/lib/ai/judge";

// Lab prototype: only answers when LAB_ENABLED=true (never set on Vercel).
const LAB_ENABLED = process.env.LAB_ENABLED === "true";

type JudgeRequest = {
  phase?: JudgePhase;
  style?: JudgeStyle;
  promise?: JudgePromise;
  turns?: JudgeTurn[];
};

const SPEAKER_LABEL = { promisor: "Promisor", counterparty: "Counterparty" } as const;

const toMessages = (turns: JudgeTurn[]): Anthropic.MessageParam[] =>
  turns.map((turn) => {
    if (turn.role === "assistant") return { role: "assistant", content: turn.text };
    const label = `[${SPEAKER_LABEL[turn.speaker ?? "promisor"]}] `;
    const content: Anthropic.ContentBlockParam[] = [
      ...(turn.images ?? []).map(
        (image): Anthropic.ImageBlockParam => ({
          type: "image",
          source: { type: "base64", media_type: image.mediaType, data: image.data },
        })
      ),
      { type: "text", text: `${label}${turn.text || "(no text, see the attached evidence)"}` },
    ];
    return { role: "user", content };
  });

export async function POST(req: Request) {
  if (!LAB_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as JudgeRequest | null;
  const phase: JudgePhase = body?.phase === "verdict" ? "verdict" : "criteria";
  const style: JudgeStyle = body?.style === "dredd" ? "dredd" : "plain";
  const promise = body?.promise;
  const turns = body?.turns ?? [];

  if (!promise?.title?.trim() || turns.length === 0 || turns[0].role !== "user") {
    return NextResponse.json({ error: "Promise title and a first user message are required" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Add ANTHROPIC_API_KEY to .env.local and restart" }, { status: 500 });
  }

  const client = new Anthropic();
  const schema = phase === "criteria" ? CriteriaSchema : VerdictSchema;

  try {
    const response = await client.messages.parse({
      model: JUDGE_MODEL,
      max_tokens: 4000,
      system: buildSystemPrompt(phase, promise, style),
      messages: toMessages(turns),
      output_config: { effort: "medium", format: zodOutputFormat(schema) },
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "The model declined to answer" }, { status: 422 });
    }
    if (!response.parsed_output) {
      return NextResponse.json({ error: `No structured answer (stop: ${response.stop_reason})` }, { status: 502 });
    }

    const { input_tokens: inputTokens, output_tokens: outputTokens } = response.usage;
    return NextResponse.json({
      result: response.parsed_output,
      // The model that actually answered, as reported by the API.
      model: response.model,
      usage: { inputTokens, outputTokens, costUsd: estimateCostUsd(inputTokens, outputTokens) },
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "No valid ANTHROPIC_API_KEY in .env.local" }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited, try again in a minute" }, { status: 429 });
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return NextResponse.json({ error: "Could not reach the Claude API" }, { status: 502 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Claude API error ${error.status}: ${error.message}` }, { status: 502 });
    }
    throw error;
  }
}

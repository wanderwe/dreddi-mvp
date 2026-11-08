import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { JudgeError, noLongDashes, toJudgeError } from "./askJudge";
import { JUDGE_MODEL, estimateCostUsd } from "./judge";
import {
  QuickVerdictSchema,
  buildQuickVerdictSystem,
  buildQuickVerdictUser,
  cleanSources,
  type QuickDisputeInput,
  type QuickVerdict,
} from "./quickVerdict";

// Server only: one quick verdict, with web search for fact questions.

export const MAX_WEB_SEARCHES = 3;
// $ per search (web search is billed apart from tokens).
const SEARCH_PRICE = 0.01;
// A search-heavy answer may pause; it is resumed a couple of times at most.
const MAX_CONTINUATIONS = 2;

export type QuickVerdictAnswer = {
  verdict: QuickVerdict;
  model: string;
  usage: { inputTokens: number; outputTokens: number; webSearches: number; costUsd: number };
};

const tidy = (text: string) => noLongDashes(text).trim();

export async function askQuickVerdict(input: QuickDisputeInput): Promise<QuickVerdictAnswer> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new JudgeError("Add ANTHROPIC_API_KEY to .env.local and restart", 500);
  }
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: buildQuickVerdictUser(input) }];
  let inputTokens = 0;
  let outputTokens = 0;
  let webSearches = 0;

  try {
    for (let attempt = 0; ; attempt++) {
      const response = await client.messages.parse({
        model: JUDGE_MODEL,
        max_tokens: 4000,
        system: buildQuickVerdictSystem(input.lang),
        messages,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: MAX_WEB_SEARCHES }],
        output_config: { effort: "medium", format: zodOutputFormat(QuickVerdictSchema) },
      });
      inputTokens += response.usage.input_tokens;
      outputTokens += response.usage.output_tokens;
      webSearches += response.usage.server_tool_use?.web_search_requests ?? 0;

      if (response.stop_reason === "pause_turn" && attempt < MAX_CONTINUATIONS) {
        messages.push({ role: "assistant", content: response.content });
        continue;
      }
      if (response.stop_reason === "refusal") throw new JudgeError("The model declined to answer", 422);
      const parsed = response.parsed_output;
      if (!parsed) throw new JudgeError(`No structured answer (stop: ${response.stop_reason})`, 502);

      const verdict: QuickVerdict = {
        ...parsed,
        short_answer: tidy(parsed.short_answer),
        explanation: tidy(parsed.explanation),
        nuance: parsed.nuance ? tidy(parsed.nuance) : null,
        share_text: tidy(parsed.share_text).slice(0, 200),
        sources: cleanSources(parsed.sources),
        // Interpersonal questions always point to a real agreement.
        suggest_mediation: parsed.suggest_mediation || parsed.question_type === "interpersonal",
      };
      return {
        verdict,
        model: response.model,
        usage: {
          inputTokens,
          outputTokens,
          webSearches,
          costUsd: estimateCostUsd(inputTokens, outputTokens) + webSearches * SEARCH_PRICE,
        },
      };
    }
  } catch (error) {
    throw toJudgeError(error);
  }
}

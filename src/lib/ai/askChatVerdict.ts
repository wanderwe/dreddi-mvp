import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { JudgeError, noLongDashes, toJudgeError } from "./askJudge";
import { JUDGE_MODEL, estimateCostUsd } from "./judge";
import { MAX_WEB_SEARCHES, type QuickVerdictAnswer } from "./askQuickVerdict";
import { cleanSources } from "./quickVerdict";
import { ChatVerdictSchema, buildChatVerdictSystem, buildChatVerdictUser, type ChatVerdict, type ChatVerdictInput } from "./chatVerdict";

// Server only: the verdict on a chat dispute, with web search for fact questions, the same way as the
// verdict between two people.

const SEARCH_PRICE = 0.01;
const MAX_CONTINUATIONS = 2;
const tidy = (text: string) => noLongDashes(text).trim();

export type ChatVerdictAnswer = Omit<QuickVerdictAnswer, "verdict"> & { verdict: ChatVerdict };

export async function askChatVerdict(input: ChatVerdictInput): Promise<ChatVerdictAnswer> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new JudgeError("Add ANTHROPIC_API_KEY to .env.local and restart", 500);
  }
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: buildChatVerdictUser(input) }];
  const ids = new Map(input.arguments.map((argument) => [argument.id, argument.position]));
  // The model names an argument by id: only one that exists, for the position it is about.
  const argumentFor = (id: string | null, position: 1 | 2) => (id && ids.get(id) === position ? id : null);
  let inputTokens = 0;
  let outputTokens = 0;
  let webSearches = 0;

  try {
    for (let attempt = 0; ; attempt++) {
      const response = await client.messages.parse({
        model: JUDGE_MODEL,
        max_tokens: 4000,
        system: buildChatVerdictSystem(input.lang),
        messages,
        tools: [{ type: "web_search_20250305" as const, name: "web_search" as const, max_uses: MAX_WEB_SEARCHES }],
        output_config: { effort: "medium", format: zodOutputFormat(ChatVerdictSchema) },
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

      return {
        verdict: {
          ...parsed,
          short_answer: tidy(parsed.short_answer),
          explanation: tidy(parsed.explanation),
          nuance: parsed.nuance ? tidy(parsed.nuance) : null,
          share_text: tidy(parsed.share_text).slice(0, 200),
          sources: cleanSources(parsed.sources),
          best_argument_1: argumentFor(parsed.best_argument_1, 1),
          best_argument_2: argumentFor(parsed.best_argument_2, 2),
        },
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

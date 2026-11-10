import { getAdminClient } from "@/app/api/promises/[id]/common";
import { JudgeError } from "./askJudge";

// Server only: a daily budget for the model calls anyone can trigger (disputes and the Telegram bot),
// in dollars over the last 24 hours. Set AI_DAILY_BUDGET_USD in Vercel to change it without a deploy.

export type AiUsageKind = "quick_verdict" | "quick_review" | "chat_verdict" | "tg_parse";

const DAY_MS = 24 * 60 * 60 * 1000;

export const aiDailyBudgetUsd = () => {
  const value = Number(process.env.AI_DAILY_BUDGET_USD);
  return Number.isFinite(value) && value >= 0 ? value : 1;
};

export async function spentTodayUsd() {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { data, error } = await getAdminClient().from("ai_usage").select("cost_usd").gte("created_at", since).returns<{ cost_usd: number | string }[]>();
  if (error) throw new JudgeError(`Budget lookup failed: ${error.message}`, 500);
  return (data ?? []).reduce((sum, row) => sum + Number(row.cost_usd), 0);
}

// Before a paid call: past the budget, the same answer as the service-wide limit.
export async function checkAiBudget() {
  if ((await spentTodayUsd()) >= aiDailyBudgetUsd()) throw new JudgeError("service_limit", 429);
}

export async function recordAiUsage(kind: AiUsageKind, costUsd: number, keys: { chatKey?: string; userKey?: string } = {}) {
  await getAdminClient()
    .from("ai_usage")
    .insert({ kind, cost_usd: Math.max(0, costUsd), chat_key: keys.chatKey ?? null, user_key: keys.userKey ?? null })
    .then(
      ({ error }) => error && console.warn("ai usage:", error.message),
      () => undefined
    );
}

// How many times this Telegram group, and this person, asked the bot to parse a dispute in the last day.
export async function tgParseAttempts(chatKey: string, userKey: string) {
  const admin = getAdminClient();
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const count = (column: "chat_key" | "user_key", value: string) =>
    admin.from("ai_usage").select("id", { count: "exact", head: true }).eq("kind", "tg_parse").eq(column, value).gte("created_at", since);
  const [{ count: inChat }, { count: byUser }] = await Promise.all([count("chat_key", chatKey), count("user_key", userKey)]);
  return { inChat: inChat ?? 0, byUser: byUser ?? 0 };
}

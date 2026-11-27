import { getAdminClient } from "@/app/api/promises/[id]/common";
import { JudgeError } from "@/lib/ai/askJudge";
import { disputesLeft, monthStart, parsePlan, planLimitsEnabled, type Plan } from "./plans";

// Server only: a person's plan and their disputes this month, across both kinds of dispute.
// creatorKey is the key the dispute tables already store for whoever created a dispute.

export async function planOf(userId: string | null): Promise<Plan> {
  if (!userId) return "free";
  const { data } = await getAdminClient().from("profiles").select("plan").eq("id", userId).maybeSingle();
  return parsePlan(data?.plan);
}

export async function disputesThisMonth(creatorKey: string, now = new Date()) {
  const admin = getAdminClient();
  const since = monthStart(now).toISOString();
  const count = (table: "quick_disputes" | "quick_chat_disputes") =>
    admin.from(table).select("id", { count: "exact", head: true }).eq("creator_key", creatorKey).gte("created_at", since);
  const [{ count: quick }, { count: chat }] = await Promise.all([count("quick_disputes"), count("quick_chat_disputes")]);
  return (quick ?? 0) + (chat ?? 0);
}

// Before a new dispute: past the plan's monthly disputes, it is refused. Does nothing while limits are off.
export async function checkDisputeAllowance(userId: string | null, creatorKey: string) {
  if (!planLimitsEnabled()) return;
  const [plan, used] = await Promise.all([planOf(userId), disputesThisMonth(creatorKey)]);
  if (disputesLeft(plan, used) === 0) throw new JudgeError("plan_limit", 429);
}

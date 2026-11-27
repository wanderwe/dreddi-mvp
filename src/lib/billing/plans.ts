// Plans, phase 0: what each plan allows, and whether limits apply at all. No database access here.
// Promises are never limited: every promise brings a second person to Dreddi. Disputes are, because
// each one costs a model verdict.

export type Plan = "free" | "pro";

// null: no limit.
export const PLANS: Record<Plan, { disputesPerMonth: number | null }> = {
  free: { disputesPerMonth: 5 },
  pro: { disputesPerMonth: null },
};

export const parsePlan = (value: unknown): Plan => (value === "pro" ? "pro" : "free");

// Off until PLAN_LIMITS_ENABLED=true in Vercel: then limits apply without a new deploy.
export const planLimitsEnabled = () => process.env.PLAN_LIMITS_ENABLED === "true";

// Months are counted in UTC: a few hours off Kyiv time at the turn of a month does not matter for a limit.
export const monthStart = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

export const disputesLeft = (plan: Plan, used: number) => {
  const limit = PLANS[plan].disputesPerMonth;
  return limit === null ? null : Math.max(0, limit - used);
};

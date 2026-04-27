import type { PromiseStatus } from "@/lib/promiseStatus";

type ScoreImpactInput = {
  status: PromiseStatus;
  due_at: string | null;
  completed_at: string | null;
  is_important: boolean;
};

const isOnTime = (dueAt: string | null, completedAt: string | null) => {
  if (!dueAt || !completedAt) return false;
  return new Date(completedAt).getTime() <= new Date(dueAt).getTime();
};

const isLate = (dueAt: string | null, completedAt: string | null) => {
  if (!dueAt || !completedAt) return false;
  return new Date(completedAt).getTime() > new Date(dueAt).getTime();
};

const IMPORTANT_MULTIPLIER = 1.5;

export const calc_score_impact = ({ status, due_at, completed_at, is_important }: ScoreImpactInput) => {
  const multiplier = is_important ? IMPORTANT_MULTIPLIER : 1;
  if (status === "confirmed") {
    return Math.round((isOnTime(due_at, completed_at) ? 4 : 3) * multiplier);
  }

  if (status === "disputed") {
    return Math.round((isLate(due_at, completed_at) ? -7 : -6) * multiplier);
  }

  return 0;
};

export const calcOnTime = (input: ScoreImpactInput) =>
  input.status === "confirmed" ? isOnTime(input.due_at, input.completed_at) : false;

export const calcLatePenalty = (input: ScoreImpactInput) =>
  input.status === "disputed" ? isLate(input.due_at, input.completed_at) : false;

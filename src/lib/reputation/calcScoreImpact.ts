import type { PromiseStatus } from "@/lib/promiseStatus";

type ScoreImpactInput = {
  status: PromiseStatus;
  due_at: string | null;
  completed_at: string | null;
};

const isOnTime = (dueAt: string | null, completedAt: string | null) => {
  if (!dueAt || !completedAt) return false;
  return new Date(completedAt).getTime() <= new Date(dueAt).getTime();
};

const isLate = (dueAt: string | null, completedAt: string | null) => {
  if (!dueAt || !completedAt) return false;
  return new Date(completedAt).getTime() > new Date(dueAt).getTime();
};

export const calc_score_impact = ({ status, due_at, completed_at }: ScoreImpactInput) => {
  if (status === "confirmed") {
    return isOnTime(due_at, completed_at) ? 4 : 3;
  }

  if (status === "disputed") {
    return isLate(due_at, completed_at) ? -7 : -6;
  }

  return 0;
};

export const calcOnTime = (input: ScoreImpactInput) =>
  input.status === "confirmed" ? isOnTime(input.due_at, input.completed_at) : false;

export const calcLatePenalty = (input: ScoreImpactInput) =>
  input.status === "disputed" ? isLate(input.due_at, input.completed_at) : false;

import { resolveExecutorId } from "@/lib/promiseParticipants";
import type { PromiseStatus } from "@/lib/promiseStatus";

type OnTimePromiseRow = {
  status: PromiseStatus;
  due_at: string | null;
  completed_at: string | null;
  confirmed_at: string | null;
  creator_id: string;
  counterparty_id: string | null;
  promisor_id: string | null;
  promisee_id: string | null;
};

type OnTimeMetrics = {
  confirmed: number;
  disputed: number;
  confirmedWithDeadline: number;
  onTime: number;
  totalCompleted: number;
};

const isOnTime = (row: OnTimePromiseRow) => {
  if (!row.due_at) return false;
  if (!row.completed_at) return false;
  return new Date(row.completed_at).getTime() <= new Date(row.due_at).getTime();
};

export const buildOnTimeMetrics = (rows: OnTimePromiseRow[], userId: string): OnTimeMetrics => {
  const metrics: OnTimeMetrics = {
    confirmed: 0,
    disputed: 0,
    confirmedWithDeadline: 0,
    onTime: 0,
    totalCompleted: 0,
  };

  for (const row of rows) {
    const executorId = resolveExecutorId(row);
    if (!executorId || executorId !== userId) continue;

    if (row.status === "confirmed") {
      metrics.confirmed += 1;
      if (row.due_at) {
        metrics.confirmedWithDeadline += 1;
        if (isOnTime(row)) metrics.onTime += 1;
      }
    } else if (row.status === "disputed") {
      metrics.disputed += 1;
    }

    if (row.status === "confirmed" || row.status === "disputed") {
      metrics.totalCompleted += 1;
    }
  }

  return metrics;
};

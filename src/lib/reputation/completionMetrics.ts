import { isPromiseAccepted, PromiseAcceptance } from "@/lib/promiseAcceptance";
import { resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";

type ReputationPromiseForCompletion = PromiseAcceptance & {
  status: string | null;
  completed_at: string | null;
  creator_id: string | null;
  promisor_id: string | null;
  promisee_id: string | null;
  counterparty_id: string | null;
};

export type CompletionMetrics = {
  completionRate: {
    completed: number;
    total: number;
  };
  completionReview: {
    responded: number;
    total: number;
  };
};

const hasCompletionMark = (promise: ReputationPromiseForCompletion) =>
  Boolean(
    promise.completed_at ||
      promise.status === "completed_by_promisor" ||
      promise.status === "confirmed" ||
      promise.status === "disputed"
  );

const hasReviewResponse = (promise: ReputationPromiseForCompletion) =>
  promise.status === "confirmed" || promise.status === "disputed";

const getProfileUserId = (promises: ReputationPromiseForCompletion[]): string | null => {
  if (promises.length === 0) return null;

  const rowsByUser = new Map<string, Set<number>>();

  promises.forEach((promise, rowIndex) => {
    const participants = new Set(
      [promise.creator_id, promise.promisor_id, promise.promisee_id, promise.counterparty_id].filter(
        (value): value is string => Boolean(value)
      )
    );

    participants.forEach((participantId) => {
      const rows = rowsByUser.get(participantId) ?? new Set<number>();
      rows.add(rowIndex);
      rowsByUser.set(participantId, rows);
    });
  });

  let topUserId: string | null = null;
  let topRowCount = 0;
  let isTie = false;

  rowsByUser.forEach((rows, userId) => {
    if (rows.size > topRowCount) {
      topUserId = userId;
      topRowCount = rows.size;
      isTie = false;
      return;
    }

    if (rows.size === topRowCount) {
      isTie = true;
    }
  });

  if (isTie || !topUserId) return null;
  return topUserId;
};

export const getCompletionMetrics = (
  promises: ReputationPromiseForCompletion[]
): CompletionMetrics => {
  const profileUserId = getProfileUserId(promises);

  if (!profileUserId) {
    return {
      completionRate: { completed: 0, total: 0 },
      completionReview: { responded: 0, total: 0 },
    };
  }

  return promises.reduce<CompletionMetrics>(
    (acc, promise) => {
      if (!isPromiseAccepted(promise)) {
        return acc;
      }

      if (!promise.creator_id) return acc;

      const executorId = resolveExecutorId({
        creator_id: promise.creator_id,
        promisor_id: promise.promisor_id,
        promisee_id: promise.promisee_id,
        counterparty_id: promise.counterparty_id,
      });
      const reviewerId = resolveCounterpartyId({
        creator_id: promise.creator_id,
        promisor_id: promise.promisor_id,
        promisee_id: promise.promisee_id,
        counterparty_id: promise.counterparty_id,
      });

      if (executorId === profileUserId) {
        acc.completionRate.total += 1;
        if (hasCompletionMark(promise)) {
          acc.completionRate.completed += 1;
        }
      }

      if (reviewerId === profileUserId && hasCompletionMark(promise)) {
        acc.completionReview.total += 1;
        if (hasReviewResponse(promise)) {
          acc.completionReview.responded += 1;
        }
      }

      return acc;
    },
    {
      completionRate: { completed: 0, total: 0 },
      completionReview: { responded: 0, total: 0 },
    }
  );
};

import { PromiseStatus } from "./promiseStatus";

export type CancelErrorCode =
  | "FORBIDDEN_NOT_PROMISOR"
  | "CANNOT_CANCEL_ACCEPTED"
  | "CANNOT_CANCEL_FINAL_STATUS"
  | "CANNOT_CANCEL_STATUS";

export type CancelCheckResult =
  | { ok: true }
  | { ok: false; code: CancelErrorCode; message: string };

type CancelablePromise = {
  status: PromiseStatus;
  creator_id: string;
  counterparty_id: string | null;
};

export function evaluateCancelPermission(
  promise: CancelablePromise,
  userId: string
): CancelCheckResult {
  if (promise.creator_id !== userId) {
    return { ok: false, code: "FORBIDDEN_NOT_PROMISOR", message: "Only the promisor can cancel" };
  }

  if (promise.counterparty_id) {
    return {
      ok: false,
      code: "CANNOT_CANCEL_ACCEPTED",
      message: "Promise was already accepted by the counterparty",
    };
  }

  if (promise.status === "confirmed" || promise.status === "disputed") {
    return {
      ok: false,
      code: "CANNOT_CANCEL_FINAL_STATUS",
      message: "Finalized promises cannot be canceled",
    };
  }

  if (promise.status !== "active" && promise.status !== "completed_by_promisor") {
    return {
      ok: false,
      code: "CANNOT_CANCEL_STATUS",
      message: "Promise cannot be canceled in its current state",
    };
  }

  return { ok: true };
}

import type { PromiseStatus } from "@/lib/promiseStatus";
import type { PromiseUiStatus } from "@/lib/promiseUiStatus";

export type AgreementFlowKey = "created" | "accepted" | "active" | "completed" | "confirmed" | "disputed";

export type AgreementFlowState = {
  key: AgreementFlowKey;
  complete: boolean;
  current: boolean;
  disputed?: boolean;
};

type BuildAgreementFlowStateInput = {
  status: PromiseStatus;
  uiStatus: PromiseUiStatus;
  acceptedAt: string | null;
  completedAt: string | null;
  confirmedAt: string | null;
  disputedAt: string | null;
};

export function buildAgreementFlowState(input: BuildAgreementFlowStateInput): AgreementFlowState[] {
  const hasAccepted = Boolean(input.acceptedAt);
  const hasCompleted = Boolean(input.completedAt || input.confirmedAt || input.disputedAt);

  const base: AgreementFlowState[] = [
    { key: "created", complete: true, current: false },
    { key: "accepted", complete: hasAccepted, current: input.uiStatus === "awaiting_acceptance" },
    {
      key: "active",
      complete: hasCompleted || input.status === "confirmed" || input.status === "disputed",
      current: input.uiStatus === "active",
    },
    { key: "completed", complete: hasCompleted, current: input.uiStatus === "completed_by_promisor" },
    {
      key: "confirmed",
      complete: input.status === "confirmed",
      current: input.uiStatus === "completed_by_promisor",
    },
  ];

  if (input.status === "disputed") {
    return [
      ...base.slice(0, 4),
      { key: "disputed", complete: true, current: true, disputed: true },
    ];
  }

  return base;
}

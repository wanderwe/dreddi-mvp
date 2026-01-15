import type { PromiseStatus } from "@/lib/promiseStatus";

export type PromiseRowMin = {
  id: string;
  title: string;
  status: PromiseStatus;
  due_at: string | null;
  completed_at: string | null;
  creator_id: string;
  counterparty_id: string | null;
  promisor_id: string | null;
  promisee_id: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  disputed_code: string | null;
  dispute_reason: string | null;
  condition_text: string | null;
  condition_met_at: string | null;
  condition_met_by: string | null;
};

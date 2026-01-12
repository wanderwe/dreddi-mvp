export type PromiseParticipants = {
  creator_id: string;
  promisor_id: string | null;
  promisee_id: string | null;
  counterparty_id: string | null;
};

export function resolveExecutorId(record: PromiseParticipants): string | null {
  if (record.promisor_id) return record.promisor_id;
  if (record.promisee_id) return null;
  return record.creator_id;
}

export function resolveCounterpartyId(record: PromiseParticipants): string | null {
  if (record.promisee_id) return record.promisee_id;
  return record.counterparty_id ?? null;
}

export type PromiseParticipants = {
  creator_id: string;
  promisor_id: string | null;
  promisee_id: string | null;
  counterparty_id: string | null;
};

export function resolveExecutorId(record: PromiseParticipants): string | null {
  if (record.promisor_id) return record.promisor_id;
  if (record.promisee_id) {
    if (record.counterparty_id && record.counterparty_id !== record.promisee_id) {
      return record.counterparty_id;
    }
    return null;
  }
  return record.creator_id;
}

export function resolveCounterpartyId(record: PromiseParticipants): string | null {
  const executorId = resolveExecutorId(record);
  if (!executorId) return null;

  if (executorId === record.creator_id) {
    return record.counterparty_id ?? null;
  }

  if (record.counterparty_id && executorId === record.counterparty_id) {
    return record.creator_id;
  }

  if (record.promisor_id && record.promisee_id) {
    if (executorId === record.promisor_id) return record.promisee_id;
    if (executorId === record.promisee_id) return record.promisor_id;
  }

  if (record.creator_id !== executorId) return record.creator_id;
  if (record.counterparty_id && record.counterparty_id !== executorId) {
    return record.counterparty_id;
  }

  return null;
}

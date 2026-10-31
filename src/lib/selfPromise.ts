// A promise to yourself is created already active with no other side, so it was activated in the same
// instant it was recorded. A deal the creator activated later, while still waiting for someone to join
// by the invite link, is not one: that person can still come.
export type SelfPromiseFields = {
  activated_without_counterparty?: boolean | null;
  activated_without_counterparty_at?: string | null;
  invited_at?: string | null;
  counterparty_id: string | null;
};

export const isSelfPromise = (row: SelfPromiseFields) =>
  Boolean(row.activated_without_counterparty) &&
  !row.counterparty_id &&
  Boolean(row.activated_without_counterparty_at) &&
  row.activated_without_counterparty_at === row.invited_at;

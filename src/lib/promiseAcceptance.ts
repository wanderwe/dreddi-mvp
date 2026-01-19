export type PromiseAcceptance = {
  counterparty_accepted_at: string | null;
};

export const isPromiseAccepted = (row: PromiseAcceptance | null | undefined) =>
  Boolean(row?.counterparty_accepted_at);

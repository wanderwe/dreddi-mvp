-- Allow creator to activate an agreement without waiting for counterparty to join.
-- The invite link remains valid; counterparty can still join later via the link.
-- If counterparty never joins and the agreement is finalized, reputation is not affected.

ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS activated_without_counterparty boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS activated_without_counterparty_at timestamptz;

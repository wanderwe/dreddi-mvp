-- MVP high-stake deals
ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS is_high_stake boolean NOT NULL DEFAULT false;

ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS high_stake_enabled_at timestamptz NULL;

-- Optional helper index for profile/invite filtering by finalized high-stake records.
CREATE INDEX IF NOT EXISTS promises_finalized_high_stake_idx
  ON promises (creator_id, confirmed_at DESC, disputed_at DESC)
  WHERE is_high_stake = true AND status IN ('confirmed', 'disputed');

-- Account deletion support: keep shared deal history while anonymizing profiles.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

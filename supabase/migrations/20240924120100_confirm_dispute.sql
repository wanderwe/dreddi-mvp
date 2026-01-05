-- Confirm / dispute workflow columns for promises (idempotent)
ALTER TABLE promises ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS confirmed_at timestamptz NULL;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS disputed_at timestamptz NULL;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS dispute_reason text NULL;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS disputed_code text NULL;

-- Ensure status column supports full lifecycle
ALTER TABLE promises
  DROP CONSTRAINT IF EXISTS promises_status_valid;
ALTER TABLE promises
  ADD CONSTRAINT promises_status_valid
  CHECK (status IN ('active','completed_by_promisor','confirmed','disputed','fulfilled','broken'));

-- Keep dispute codes aligned to API constants
ALTER TABLE promises
  DROP CONSTRAINT IF EXISTS promises_dispute_code_valid;
ALTER TABLE promises
  ADD CONSTRAINT promises_dispute_code_valid
  CHECK (disputed_code IS NULL OR disputed_code IN ('not_completed','partial','late','other'));

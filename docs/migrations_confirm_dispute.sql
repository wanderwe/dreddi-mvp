-- Confirm / dispute workflow columns for promises
ALTER TABLE promises ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS confirmed_at timestamptz NULL;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS disputed_at timestamptz NULL;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS dispute_reason text NULL;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS disputed_code text NULL;

-- Extend status enum/text usage to include new lifecycle states
-- Values: active, completed_by_promisor, confirmed, disputed
-- Apply according to your schema (enum or text). Example for text column:
-- UPDATE promises SET status = 'completed_by_promisor' WHERE false;

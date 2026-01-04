-- Confirm / dispute workflow columns for promises
ALTER TABLE promises ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS confirmed_at timestamptz NULL;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS disputed_at timestamptz NULL;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS dispute_reason text NULL;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS disputed_code text NULL;

-- Extend status enum/text usage to include new lifecycle states
-- Values: active, completed_by_promisor, confirmed, disputed
-- Apply according to your schema (enum or text).

DO $$
DECLARE
  status_schema text;
  status_type text;
  status_kind char;
BEGIN
  SELECT n.nspname, t.typname, t.typtype
    INTO status_schema, status_type, status_kind
  FROM pg_attribute a
  JOIN pg_type t ON a.atttypid = t.oid
  JOIN pg_namespace n ON t.typnamespace = n.oid
  WHERE a.attrelid = 'public.promises'::regclass
    AND a.attname = 'status'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF status_type IS NULL THEN
    RAISE NOTICE 'promises.status column not found — check the table name';
    RETURN;
  END IF;

  IF status_type = 'text' THEN
    RAISE NOTICE 'promises.status is text — no enum migration needed';
    RETURN;
  END IF;

  IF status_kind = 'e' THEN
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS ''completed_by_promisor''', status_schema, status_type);
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS ''confirmed''', status_schema, status_type);
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS ''disputed''', status_schema, status_type);
  ELSE
    RAISE NOTICE 'promises.status uses %%.%% — update manually to allow new statuses', status_schema, status_type;
  END IF;
END $$;

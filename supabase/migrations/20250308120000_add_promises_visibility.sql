DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'promise_visibility'
  ) THEN
    CREATE TYPE promise_visibility AS ENUM ('private', 'public');
  END IF;
END $$;

ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS visibility promise_visibility NOT NULL DEFAULT 'private';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'promises'
      AND column_name = 'is_public'
  ) THEN
    COMMENT ON COLUMN promises.is_public IS 'DEPRECATED: use promises.visibility';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'promises'
      AND column_name = 'public_by_creator'
  ) THEN
    COMMENT ON COLUMN promises.public_by_creator IS 'DEPRECATED: use promises.visibility';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'promises'
      AND column_name = 'public_by_counterparty'
  ) THEN
    COMMENT ON COLUMN promises.public_by_counterparty IS 'DEPRECATED: use promises.visibility';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_public'
  ) THEN
    COMMENT ON COLUMN profiles.is_public IS 'DEPRECATED: use profiles.is_public_profile';
  END IF;
END $$;

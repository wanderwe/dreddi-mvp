DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_display_name_length_check'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_display_name_length_check
    CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 2 AND 40);
  END IF;
END $$;

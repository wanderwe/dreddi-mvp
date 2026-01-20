-- Ensure profiles are public by default.

ALTER TABLE profiles
  ALTER COLUMN is_public_profile SET DEFAULT true;

UPDATE profiles
SET is_public_profile = true
WHERE is_public_profile = false;

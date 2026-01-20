-- Smoke check for public profile visibility and stats.
-- Replace <public_user_id> and <private_user_id> with real auth.users IDs before running.

BEGIN;

UPDATE profiles
SET is_public_profile = true
WHERE id = '<public_user_id>';

UPDATE profiles
SET is_public_profile = false
WHERE id = '<private_user_id>';

SELECT handle, confirmed_count, completed_count, disputed_count
FROM public_profile_stats
WHERE profile_id IN ('<public_user_id>', '<private_user_id>');

ROLLBACK;

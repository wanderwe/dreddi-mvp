-- Public profile visibility smoke test for Supabase SQL Editor.
--
-- Usage:
--   1) Paste into the Supabase SQL Editor and run.
--   2) Optionally set the handles/emails in the params CTE to target
--      specific users (no UUIDs needed).
--
-- Notes:
--   - Changes are wrapped in a transaction and rolled back at the end.
--   - If the handles/emails are not found, the script will return 0 rows
--     rather than raising UUID casting errors.

BEGIN;

CREATE TEMP TABLE temp_profile_visibility_targets AS
WITH params AS (
  SELECT
    NULL::text AS public_handle,
    NULL::text AS public_email,
    NULL::text AS private_handle,
    NULL::text AS private_email
),
public_target AS (
  SELECT
    profiles.id,
    profiles.handle,
    COALESCE(profiles.email, auth_users.email) AS resolved_email
  FROM profiles
  LEFT JOIN auth.users AS auth_users ON auth_users.id = profiles.id
  CROSS JOIN params
  WHERE profiles.handle IS NOT NULL
  ORDER BY
    (profiles.handle = params.public_handle)::int DESC,
    (COALESCE(profiles.email, auth_users.email) = params.public_email)::int DESC,
    profiles.created_at
  LIMIT 1
),
private_target AS (
  SELECT
    profiles.id,
    profiles.handle,
    COALESCE(profiles.email, auth_users.email) AS resolved_email
  FROM profiles
  LEFT JOIN auth.users AS auth_users ON auth_users.id = profiles.id
  CROSS JOIN params
  WHERE profiles.handle IS NOT NULL
    AND profiles.id <> (SELECT id FROM public_target)
  ORDER BY
    (profiles.handle = params.private_handle)::int DESC,
    (COALESCE(profiles.email, auth_users.email) = params.private_email)::int DESC,
    profiles.created_at
  LIMIT 1
)
SELECT
  public_target.id AS profile_id,
  public_target.handle,
  public_target.resolved_email AS email,
  TRUE AS should_be_public
FROM public_target
UNION ALL
SELECT
  private_target.id AS profile_id,
  private_target.handle,
  private_target.resolved_email AS email,
  FALSE AS should_be_public
FROM private_target;

UPDATE profiles
SET is_public_profile = temp_profile_visibility_targets.should_be_public
FROM temp_profile_visibility_targets
WHERE profiles.id = temp_profile_visibility_targets.profile_id;

SELECT
  temp_profile_visibility_targets.handle,
  temp_profile_visibility_targets.email,
  profiles.is_public_profile
FROM temp_profile_visibility_targets
JOIN profiles ON profiles.id = temp_profile_visibility_targets.profile_id
ORDER BY temp_profile_visibility_targets.handle;

SELECT
  temp_profile_visibility_targets.handle,
  temp_profile_visibility_targets.email,
  public_profile_stats.confirmed_count,
  public_profile_stats.completed_count,
  public_profile_stats.disputed_count,
  public_profile_stats.active_count,
  public_profile_stats.pending_acceptance_count,
  public_profile_stats.overdue_count
FROM temp_profile_visibility_targets
LEFT JOIN public_profile_stats
  ON public_profile_stats.profile_id = temp_profile_visibility_targets.profile_id
ORDER BY temp_profile_visibility_targets.handle;

ROLLBACK;

-- Verify public_profile_stats returns identical values for owner, external user, and anon.
-- Usage in Supabase SQL editor:
-- 1) Replace target handle and UUIDs.
-- 2) Run each role section with corresponding JWT/session role.

-- target handle
-- \set target_handle 'alice'

SELECT
  profile_id,
  handle,
  reputation_score,
  confirmed_count,
  disputed_count,
  completed_count,
  unique_counterparties_count,
  deals_with_due_date_count,
  on_time_completion_count,
  on_time_completion_rate,
  completion_executor_marked_count,
  completion_executor_total_count,
  completion_reviewer_responded_count,
  completion_reviewer_total_count
FROM public.public_profile_stats
WHERE handle = 'REPLACE_TARGET_HANDLE';

-- Add profile tags to profiles and public profile stats.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND column_name = 'profile_tags'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN profile_tags text[] DEFAULT '{}'::text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_profile_tags_valid'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_profile_tags_valid
    CHECK (
      profile_tags IS NULL
      OR (
        array_length(profile_tags, 1) <= 7
        AND COALESCE(
          (
            SELECT bool_and(char_length(tag) BETWEEN 2 AND 24)
            FROM unnest(profile_tags) AS tag
          ),
          true
        )
        AND (
          SELECT count(DISTINCT tag) = count(*)
          FROM unnest(profile_tags) AS tag
        )
      )
    );
  END IF;
END $$;

DROP VIEW IF EXISTS public_profile_stats;

CREATE VIEW public_profile_stats AS
WITH promise_base AS (
  SELECT
    COALESCE(
      public.resolve_promise_executor_id(
        promisor_id,
        promisee_id,
        counterparty_id,
        creator_id
      ),
      creator_id
    ) AS executor_id,
    counterparty_id,
    status,
    due_at,
    completed_at,
    confirmed_at,
    disputed_at,
    created_at,
    invite_status
  FROM promises
),
stats AS (
  SELECT
    executor_id,
    COUNT(*) FILTER (WHERE status = 'confirmed')::bigint AS confirmed_count,
    COUNT(*) FILTER (WHERE status = 'completed_by_promisor')::bigint AS completed_count,
    COUNT(*) FILTER (WHERE status = 'disputed')::bigint AS disputed_count,
    COUNT(*) FILTER (
      WHERE status IN ('active', 'completed_by_promisor')
        AND due_at IS NOT NULL
        AND due_at < NOW()
    )::bigint AS overdue_count,
    COUNT(*) FILTER (
      WHERE status = 'active'
        AND invite_status = 'awaiting_acceptance'
    )::bigint AS pending_acceptance_count,
    COUNT(*) FILTER (
      WHERE (due_at IS NULL OR due_at >= NOW())
        AND invite_status = 'accepted'
        AND status IN ('active', 'completed_by_promisor')
    )::bigint AS active_count,
    MAX(COALESCE(confirmed_at, disputed_at, completed_at, created_at)) AS last_activity_at
  FROM promise_base
  GROUP BY executor_id
),
public_deals AS (
  SELECT
    executor_id,
    counterparty_id,
    status,
    due_at,
    completed_at,
    COALESCE(confirmed_at, disputed_at, completed_at, created_at) AS finalized_at
  FROM promise_base
  WHERE status IN ('confirmed', 'disputed')
),
counterparty_firsts AS (
  SELECT
    executor_id,
    counterparty_id,
    MIN(finalized_at) AS first_deal_at
  FROM public_deals
  WHERE counterparty_id IS NOT NULL
  GROUP BY executor_id, counterparty_id
),
deal_metrics AS (
  SELECT
    executor_id,
    COUNT(*)::bigint AS completed_deals_count,
    COUNT(*) FILTER (WHERE status = 'confirmed')::bigint AS confirmed_count,
    COUNT(*) FILTER (WHERE status = 'disputed')::bigint AS disputed_count,
    COUNT(*) FILTER (WHERE due_at IS NOT NULL)::bigint AS deals_with_due_date_count,
    COUNT(*) FILTER (
      WHERE status = 'confirmed'
        AND due_at IS NOT NULL
        AND completed_at IS NOT NULL
        AND completed_at <= due_at
    )::bigint AS on_time_completion_count,
    MIN(finalized_at) AS first_deal_at
  FROM public_deals
  GROUP BY executor_id
),
counterparty_metrics AS (
  SELECT
    executor_id,
    COUNT(*)::bigint AS unique_counterparties_count,
    COUNT(*)::bigint AS deals_with_new_people_count
  FROM counterparty_firsts
  GROUP BY executor_id
)
SELECT
  profiles.id AS profile_id,
  profiles.handle,
  profiles.email,
  profiles.display_name,
  profiles.avatar_url,
  profiles.profile_tags,
  COALESCE(user_reputation.score, 50) AS reputation_score,
  COALESCE(stats.confirmed_count, 0::bigint) AS confirmed_count,
  COALESCE(stats.completed_count, 0::bigint) AS completed_count,
  COALESCE(stats.disputed_count, 0::bigint) AS disputed_count,
  COALESCE(stats.active_count, 0::bigint) AS active_count,
  COALESCE(stats.pending_acceptance_count, 0::bigint) AS pending_acceptance_count,
  COALESCE(stats.overdue_count, 0::bigint) AS overdue_count,
  stats.last_activity_at,
  COALESCE(counterparty_metrics.unique_counterparties_count, 0::bigint)
    AS unique_counterparties_count,
  COALESCE(counterparty_metrics.deals_with_new_people_count, 0::bigint)
    AS deals_with_new_people_count,
  CASE
    WHEN COALESCE(deal_metrics.completed_deals_count, 0) > 0
      THEN ROUND(
        (1 - COALESCE(counterparty_metrics.deals_with_new_people_count, 0)::numeric
          / deal_metrics.completed_deals_count) * 100,
        2
      )
    ELSE 0
  END AS repeat_counterparty_rate,
  COALESCE(deal_metrics.deals_with_due_date_count, 0::bigint)
    AS deals_with_due_date_count,
  COALESCE(deal_metrics.on_time_completion_count, 0::bigint)
    AS on_time_completion_count,
  CASE
    WHEN COALESCE(deal_metrics.deals_with_due_date_count, 0) > 0
      THEN ROUND(
        deal_metrics.on_time_completion_count::numeric
          / deal_metrics.deals_with_due_date_count * 100,
        2
      )
    ELSE 0
  END AS on_time_completion_rate,
  CASE
    WHEN COALESCE(deal_metrics.completed_deals_count, 0) > 0
      THEN ROUND(
        deal_metrics.disputed_count::numeric
          / deal_metrics.completed_deals_count * 100,
        2
      )
    ELSE 0
  END AS dispute_rate,
  COALESCE(deal_metrics.confirmed_count, 0::bigint) AS total_confirmed_deals,
  CASE
    WHEN deal_metrics.first_deal_at IS NULL THEN 0
    ELSE DATE_PART('day', NOW() - deal_metrics.first_deal_at)
  END::bigint AS reputation_age_days,
  CASE
    WHEN deal_metrics.first_deal_at IS NULL THEN 0
    ELSE ROUND(
      (deal_metrics.completed_deals_count
        / NULLIF(DATE_PART('day', NOW() - deal_metrics.first_deal_at) / 30.0, 0))::numeric,
      2
    )
  END AS avg_deals_per_month
FROM profiles
LEFT JOIN user_reputation ON user_reputation.user_id = profiles.id
LEFT JOIN stats ON stats.executor_id = profiles.id
LEFT JOIN deal_metrics ON deal_metrics.executor_id = profiles.id
LEFT JOIN counterparty_metrics ON counterparty_metrics.executor_id = profiles.id
WHERE profiles.handle IS NOT NULL
  AND profiles.is_public_profile IS TRUE;

GRANT SELECT ON public_profile_stats TO anon, authenticated;

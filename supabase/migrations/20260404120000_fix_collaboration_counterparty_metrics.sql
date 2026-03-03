CREATE OR REPLACE VIEW public_profile_stats AS
WITH promise_base AS (
  SELECT
    p.id AS promise_id,
    p.title,
    p.status,
    p.created_at,
    p.completed_at,
    p.confirmed_at,
    p.disputed_at,
    p.due_at,
    p.invite_status,
    COALESCE(
      public.resolve_promise_executor_id(
        p.promisor_id,
        p.promisee_id,
        p.counterparty_id,
        p.creator_id
      ),
      p.creator_id
    ) AS executor_id,
    public.resolve_promise_counterparty_id(
      p.promisor_id,
      p.promisee_id,
      p.counterparty_id,
      p.creator_id
    ) AS raw_counterparty_user_id
  FROM promises p
),
normalized_promises AS (
  SELECT
    promise_id,
    title,
    status,
    created_at,
    completed_at,
    confirmed_at,
    disputed_at,
    due_at,
    invite_status,
    executor_id,
    CASE
      WHEN raw_counterparty_user_id IS NULL THEN NULL
      WHEN raw_counterparty_user_id = executor_id THEN NULL
      ELSE raw_counterparty_user_id
    END AS counterparty_user_id,
    CASE
      WHEN status = 'confirmed' THEN confirmed_at
      WHEN status = 'disputed' THEN disputed_at
      ELSE NULL
    END AS finalized_at
  FROM promise_base
),
stats AS (
  SELECT
    executor_id,
    COUNT(*) FILTER (WHERE status = 'confirmed')::bigint AS confirmed_count,
    COUNT(*) FILTER (WHERE status = 'disputed')::bigint AS disputed_count,
    COUNT(*) FILTER (WHERE status = 'active')::bigint AS active_count,
    COUNT(*) FILTER (WHERE status = 'completed_by_promisor')::bigint AS pending_acceptance_count,
    COUNT(*) FILTER (
      WHERE status = 'active'
        AND due_at IS NOT NULL
        AND due_at < now()
    )::bigint AS overdue_count,
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'disputed'))::bigint AS completed_count,
    MAX(COALESCE(confirmed_at, disputed_at, completed_at, created_at)) AS last_activity_at
  FROM normalized_promises
  GROUP BY executor_id
),
public_deals AS (
  SELECT DISTINCT
    promise_id,
    executor_id,
    counterparty_user_id,
    status,
    due_at,
    completed_at,
    finalized_at
  FROM normalized_promises
  WHERE status IN ('confirmed', 'disputed')
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
    COUNT(DISTINCT counterparty_user_id)::bigint AS unique_counterparties_count,
    MIN(finalized_at) AS first_deal_at
  FROM public_deals
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
  COALESCE(deal_metrics.unique_counterparties_count, 0::bigint)
    AS unique_counterparties_count,
  COALESCE(deal_metrics.unique_counterparties_count, 0::bigint)
    AS deals_with_new_people_count,
  CASE
    WHEN COALESCE(deal_metrics.completed_deals_count, 0) > 0
      THEN ROUND(
        (1 - COALESCE(deal_metrics.unique_counterparties_count, 0)::numeric
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
      (
        deal_metrics.completed_deals_count
          / NULLIF(DATE_PART('day', NOW() - deal_metrics.first_deal_at) / 30.0, 0)
      )::numeric,
      2
    )
  END AS avg_deals_per_month
FROM profiles
LEFT JOIN user_reputation ON user_reputation.user_id = profiles.id
LEFT JOIN stats ON stats.executor_id = profiles.id
LEFT JOIN deal_metrics ON deal_metrics.executor_id = profiles.id
WHERE profiles.handle IS NOT NULL
  AND profiles.is_public_profile IS TRUE;

GRANT SELECT ON public_profile_stats TO anon, authenticated;

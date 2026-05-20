-- Fix public profile stats to be owner-scoped and viewer-independent.
-- Root cause: security_invoker + reading promises caused RLS to scope aggregates to auth.uid().
-- This view computes aggregate metrics from all finalized reputation-bearing deals
-- (public + private) and runs with definer semantics.

DROP VIEW IF EXISTS public.public_profile_stats;

CREATE VIEW public.public_profile_stats AS
WITH profile_promises AS (
  SELECT
    p.id,
    p.title,
    p.status,
    p.created_at,
    p.completed_at,
    p.confirmed_at,
    p.disputed_at,
    p.due_at,
    p.invite_status,
    p.accepted_at,
    p.counterparty_accepted_at,
    p.creator_id,
    p.promisor_id,
    p.promisee_id,
    p.counterparty_id,
    public.resolve_promise_executor_id(
      p.promisor_id,
      p.promisee_id,
      p.counterparty_id,
      p.creator_id
    ) AS executor_id,
    public.resolve_promise_counterparty_id(
      p.promisor_id,
      p.promisee_id,
      p.counterparty_id,
      p.creator_id
    ) AS reviewer_id,
    CASE
      WHEN p.status = 'confirmed' THEN p.confirmed_at
      WHEN p.status = 'disputed' THEN p.disputed_at
      ELSE NULL
    END AS finalized_at,
    (
      p.invite_status = 'accepted'
      OR p.accepted_at IS NOT NULL
      OR p.counterparty_accepted_at IS NOT NULL
    ) AS is_accepted
  FROM public.promises p
),
stats AS (
  SELECT
    executor_id,
    COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_count,
    COUNT(*) FILTER (WHERE status = 'disputed') AS disputed_count,
    COUNT(*) FILTER (WHERE status = 'active') AS active_count,
    COUNT(*) FILTER (WHERE status = 'completed_by_promisor') AS pending_acceptance_count,
    COUNT(*) FILTER (
      WHERE status = 'active'
        AND due_at IS NOT NULL
        AND due_at < now()
    ) AS overdue_count,
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'disputed')) AS completed_count,
    MAX(
      COALESCE(
        CASE
          WHEN status = 'confirmed' THEN confirmed_at
          WHEN status = 'disputed' THEN disputed_at
          ELSE completed_at
        END,
        created_at
      )
    ) AS last_activity_at
  FROM profile_promises
  WHERE executor_id IS NOT NULL
  GROUP BY executor_id
),
public_deals AS (
  SELECT
    executor_id,
    status,
    due_at,
    completed_at,
    finalized_at,
    reviewer_id
  FROM profile_promises
  WHERE executor_id IS NOT NULL
    AND status IN ('confirmed', 'disputed')
),
counterparty_firsts AS (
  SELECT
    executor_id,
    reviewer_id,
    MIN(finalized_at) AS first_deal_at
  FROM public_deals
  WHERE reviewer_id IS NOT NULL
  GROUP BY executor_id, reviewer_id
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
),
completion_executor_metrics AS (
  SELECT
    executor_id,
    COUNT(*) FILTER (
      WHERE is_accepted
    )::bigint AS completion_executor_total_count,
    COUNT(*) FILTER (
      WHERE is_accepted
        AND (
          completed_at IS NOT NULL
          OR status IN ('completed_by_promisor', 'confirmed', 'disputed')
        )
    )::bigint AS completion_executor_marked_count
  FROM profile_promises
  WHERE executor_id IS NOT NULL
  GROUP BY executor_id
),
completion_reviewer_metrics AS (
  SELECT
    reviewer_id AS profile_id,
    COUNT(*) FILTER (
      WHERE reviewer_id IS NOT NULL
        AND is_accepted
        AND completed_at IS NOT NULL
    )::bigint AS completion_reviewer_total_count,
    COUNT(*) FILTER (
      WHERE reviewer_id IS NOT NULL
        AND is_accepted
        AND completed_at IS NOT NULL
        AND status IN ('confirmed', 'disputed')
    )::bigint AS completion_reviewer_responded_count
  FROM profile_promises
  WHERE reviewer_id IS NOT NULL
  GROUP BY reviewer_id
)
SELECT
  profiles.id AS profile_id,
  profiles.handle,
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
      (
        deal_metrics.completed_deals_count
          / NULLIF(DATE_PART('day', NOW() - deal_metrics.first_deal_at) / 30.0, 0)
      )::numeric,
      2
    )
  END AS avg_deals_per_month,
  COALESCE(completion_executor_metrics.completion_executor_marked_count, 0::bigint)
    AS completion_executor_marked_count,
  COALESCE(completion_executor_metrics.completion_executor_total_count, 0::bigint)
    AS completion_executor_total_count,
  COALESCE(completion_reviewer_metrics.completion_reviewer_responded_count, 0::bigint)
    AS completion_reviewer_responded_count,
  COALESCE(completion_reviewer_metrics.completion_reviewer_total_count, 0::bigint)
    AS completion_reviewer_total_count
FROM public.profiles
LEFT JOIN public.user_reputation ON user_reputation.user_id = profiles.id
LEFT JOIN stats ON stats.executor_id = profiles.id
LEFT JOIN deal_metrics ON deal_metrics.executor_id = profiles.id
LEFT JOIN counterparty_metrics ON counterparty_metrics.executor_id = profiles.id
LEFT JOIN completion_executor_metrics ON completion_executor_metrics.executor_id = profiles.id
LEFT JOIN completion_reviewer_metrics ON completion_reviewer_metrics.profile_id = profiles.id
WHERE profiles.handle IS NOT NULL
  AND profiles.is_public_profile IS TRUE;

GRANT SELECT ON public.public_profile_stats TO anon, authenticated;

CREATE OR REPLACE VIEW public_profile_stats AS
WITH raw_public_promises AS (
  SELECT
    p.id,
    p.title,
    p.status,
    p.created_at,
    p.completed_at,
    p.confirmed_at,
    p.disputed_at,
    p.due_at,
    p.creator_id,
    p.promisor_id,
    p.promisee_id,
    CASE
      WHEN p.promisor_id IS NOT NULL THEN p.promisor_id
      WHEN p.promisee_id IS NOT NULL THEN p.promisee_id
      WHEN p.counterparty_id IS NOT NULL AND p.counterparty_id <> p.creator_id THEN p.counterparty_id
      ELSE p.creator_id
    END AS executor_id,
    CASE
      WHEN p.promisor_id IS NOT NULL AND p.promisee_id IS NOT NULL THEN
        CASE
          WHEN p.promisor_id =
            CASE
              WHEN p.promisor_id IS NOT NULL THEN p.promisor_id
              WHEN p.promisee_id IS NOT NULL THEN p.promisee_id
              WHEN p.counterparty_id IS NOT NULL AND p.counterparty_id <> p.creator_id THEN p.counterparty_id
              ELSE p.creator_id
            END THEN p.promisee_id
          ELSE p.promisor_id
        END
      WHEN p.counterparty_id IS NOT NULL AND p.counterparty_id <>
        CASE
          WHEN p.promisor_id IS NOT NULL THEN p.promisor_id
          WHEN p.promisee_id IS NOT NULL THEN p.promisee_id
          WHEN p.counterparty_id IS NOT NULL AND p.counterparty_id <> p.creator_id THEN p.counterparty_id
          ELSE p.creator_id
        END THEN p.counterparty_id
      WHEN p.creator_id <>
        CASE
          WHEN p.promisor_id IS NOT NULL THEN p.promisor_id
          WHEN p.promisee_id IS NOT NULL THEN p.promisee_id
          WHEN p.counterparty_id IS NOT NULL AND p.counterparty_id <> p.creator_id THEN p.counterparty_id
          ELSE p.creator_id
        END THEN p.creator_id
      ELSE NULL
    END AS counterparty_id,
    CASE
      WHEN p.status = 'confirmed' THEN p.confirmed_at
      WHEN p.status = 'disputed' THEN p.disputed_at
      ELSE NULL
    END AS finalized_at
  FROM promises p
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
  FROM raw_public_promises
  GROUP BY executor_id
),
public_deals AS (
  SELECT
    executor_id,
    status,
    due_at,
    completed_at,
    finalized_at,
    counterparty_id
  FROM raw_public_promises
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
      (
        deal_metrics.completed_deals_count::numeric * 30
      ) / GREATEST(DATE_PART('day', NOW() - deal_metrics.first_deal_at), 30)::numeric,
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

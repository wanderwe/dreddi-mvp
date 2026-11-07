-- The completion rate on the public profile shows how often the executor marks a promise done.
-- A promise the other side confirmed without that mark says nothing about it either way, so it is
-- left out of both counts. Built from 20261106130000_public_profile_on_time.sql; the output columns
-- are unchanged, so this replaces the view in place.

CREATE OR REPLACE VIEW public.public_profile_stats AS
WITH profile_promises AS (
         SELECT p.id,
            p.title,
            p.status,
            p.created_at,
            p.completed_at,
            p.completed_on_time,
            COALESCE(p.confirmed_without_executor_completion, false) AS confirmed_without_executor_completion,
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
            resolve_promise_executor_id(p.promisor_id, p.promisee_id, p.counterparty_id, p.creator_id) AS executor_id,
            resolve_promise_counterparty_id(p.promisor_id, p.promisee_id, p.counterparty_id, p.creator_id) AS reviewer_id,
                CASE
                    WHEN p.status = 'confirmed'::text THEN p.confirmed_at
                    WHEN p.status = 'disputed'::text THEN p.disputed_at
                    ELSE NULL::timestamp with time zone
                END AS finalized_at,
            p.invite_status = 'accepted'::text OR p.accepted_at IS NOT NULL OR p.counterparty_accepted_at IS NOT NULL AS is_accepted
           FROM promises p
        ), stats AS (
         SELECT profile_promises.executor_id,
            count(*) FILTER (WHERE profile_promises.status = 'confirmed'::text) AS confirmed_count,
            count(*) FILTER (WHERE profile_promises.status = 'disputed'::text) AS disputed_count,
            count(*) FILTER (WHERE profile_promises.status = 'active'::text) AS active_count,
            count(*) FILTER (WHERE profile_promises.status = 'completed_by_promisor'::text) AS pending_acceptance_count,
            count(*) FILTER (WHERE profile_promises.status = 'active'::text AND profile_promises.due_at IS NOT NULL AND profile_promises.due_at < now()) AS overdue_count,
            count(*) FILTER (WHERE profile_promises.status = ANY (ARRAY['confirmed'::text, 'disputed'::text])) AS completed_count,
            max(COALESCE(
                CASE
                    WHEN profile_promises.status = 'confirmed'::text THEN profile_promises.confirmed_at
                    WHEN profile_promises.status = 'disputed'::text THEN profile_promises.disputed_at
                    ELSE profile_promises.completed_at
                END, profile_promises.created_at)) AS last_activity_at
           FROM profile_promises
          WHERE profile_promises.executor_id IS NOT NULL
          GROUP BY profile_promises.executor_id
        ), public_deals AS (
         SELECT profile_promises.executor_id,
            profile_promises.status,
            profile_promises.due_at,
            profile_promises.completed_at,
            profile_promises.completed_on_time,
            profile_promises.finalized_at,
            profile_promises.reviewer_id
           FROM profile_promises
          WHERE profile_promises.executor_id IS NOT NULL AND (profile_promises.status = ANY (ARRAY['confirmed'::text, 'disputed'::text]))
        ), counterparty_firsts AS (
         SELECT public_deals.executor_id,
            public_deals.reviewer_id,
            min(public_deals.finalized_at) AS first_deal_at
           FROM public_deals
          WHERE public_deals.reviewer_id IS NOT NULL
          GROUP BY public_deals.executor_id, public_deals.reviewer_id
        ), deal_metrics AS (
         SELECT public_deals.executor_id,
            count(*) AS completed_deals_count,
            count(*) FILTER (WHERE public_deals.status = 'confirmed'::text) AS confirmed_count,
            count(*) FILTER (WHERE public_deals.status = 'disputed'::text) AS disputed_count,
            count(*) FILTER (WHERE public_deals.due_at IS NOT NULL) AS deals_with_due_date_count,
            count(*) FILTER (WHERE public_deals.status = 'confirmed'::text AND public_deals.due_at IS NOT NULL AND COALESCE(public_deals.completed_on_time, public_deals.completed_at IS NOT NULL AND public_deals.completed_at <= public_deals.due_at)) AS on_time_completion_count,
            min(public_deals.finalized_at) AS first_deal_at
           FROM public_deals
          GROUP BY public_deals.executor_id
        ), counterparty_metrics AS (
         SELECT counterparty_firsts.executor_id,
            count(*) AS unique_counterparties_count,
            count(*) AS deals_with_new_people_count
           FROM counterparty_firsts
          GROUP BY counterparty_firsts.executor_id
        ), completion_executor_metrics AS (
         SELECT profile_promises.executor_id,
            count(*) FILTER (WHERE profile_promises.is_accepted AND NOT profile_promises.confirmed_without_executor_completion) AS completion_executor_total_count,
            count(*) FILTER (WHERE profile_promises.is_accepted AND NOT profile_promises.confirmed_without_executor_completion AND (profile_promises.completed_at IS NOT NULL OR (profile_promises.status = ANY (ARRAY['completed_by_promisor'::text, 'confirmed'::text, 'disputed'::text])))) AS completion_executor_marked_count
           FROM profile_promises
          WHERE profile_promises.executor_id IS NOT NULL
          GROUP BY profile_promises.executor_id
        ), completion_reviewer_metrics AS (
         SELECT profile_promises.reviewer_id AS profile_id,
            count(*) FILTER (WHERE profile_promises.reviewer_id IS NOT NULL AND profile_promises.is_accepted AND profile_promises.completed_at IS NOT NULL) AS completion_reviewer_total_count,
            count(*) FILTER (WHERE profile_promises.reviewer_id IS NOT NULL AND profile_promises.is_accepted AND profile_promises.completed_at IS NOT NULL AND (profile_promises.status = ANY (ARRAY['confirmed'::text, 'disputed'::text]))) AS completion_reviewer_responded_count
           FROM profile_promises
          WHERE profile_promises.reviewer_id IS NOT NULL
          GROUP BY profile_promises.reviewer_id
        ), streak_ranked AS (
         SELECT public_deals.executor_id,
            public_deals.status,
            row_number() OVER (PARTITION BY public_deals.executor_id ORDER BY public_deals.finalized_at DESC) AS rn
           FROM public_deals
        ), streak_breaks AS (
         SELECT streak_ranked.executor_id,
            min(streak_ranked.rn) AS first_break_rn
           FROM streak_ranked
          WHERE streak_ranked.status = 'disputed'::text
          GROUP BY streak_ranked.executor_id
        ), streak_totals AS (
         SELECT streak_ranked.executor_id,
            count(*) AS total_rn
           FROM streak_ranked
          GROUP BY streak_ranked.executor_id
        ), streak_metrics AS (
         SELECT streak_totals.executor_id,
            COALESCE(streak_breaks.first_break_rn - 1, streak_totals.total_rn) AS current_streak_count
           FROM streak_totals
             LEFT JOIN streak_breaks ON streak_breaks.executor_id = streak_totals.executor_id
        )
 SELECT profiles.id AS profile_id,
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
    COALESCE(counterparty_metrics.unique_counterparties_count, 0::bigint) AS unique_counterparties_count,
    COALESCE(counterparty_metrics.deals_with_new_people_count, 0::bigint) AS deals_with_new_people_count,
        CASE
            WHEN COALESCE(deal_metrics.completed_deals_count, 0::bigint) > 0 THEN round((1::numeric - COALESCE(counterparty_metrics.deals_with_new_people_count, 0::bigint)::numeric / deal_metrics.completed_deals_count::numeric) * 100::numeric, 2)
            ELSE 0::numeric
        END AS repeat_counterparty_rate,
    COALESCE(deal_metrics.deals_with_due_date_count, 0::bigint) AS deals_with_due_date_count,
    COALESCE(deal_metrics.on_time_completion_count, 0::bigint) AS on_time_completion_count,
        CASE
            WHEN COALESCE(deal_metrics.deals_with_due_date_count, 0::bigint) > 0 THEN round(deal_metrics.on_time_completion_count::numeric / deal_metrics.deals_with_due_date_count::numeric * 100::numeric, 2)
            ELSE 0::numeric
        END AS on_time_completion_rate,
        CASE
            WHEN COALESCE(deal_metrics.completed_deals_count, 0::bigint) > 0 THEN round(deal_metrics.disputed_count::numeric / deal_metrics.completed_deals_count::numeric * 100::numeric, 2)
            ELSE 0::numeric
        END AS dispute_rate,
    COALESCE(deal_metrics.confirmed_count, 0::bigint) AS total_confirmed_deals,
        CASE
            WHEN deal_metrics.first_deal_at IS NULL THEN 0::double precision
            ELSE date_part('day'::text, now() - deal_metrics.first_deal_at)
        END::bigint AS reputation_age_days,
        CASE
            WHEN deal_metrics.first_deal_at IS NULL THEN 0::numeric
            ELSE round((deal_metrics.completed_deals_count::double precision / NULLIF(date_part('day'::text, now() - deal_metrics.first_deal_at) / 30.0::double precision, 0::double precision))::numeric, 2)
        END AS avg_deals_per_month,
    COALESCE(completion_executor_metrics.completion_executor_marked_count, 0::bigint) AS completion_executor_marked_count,
    COALESCE(completion_executor_metrics.completion_executor_total_count, 0::bigint) AS completion_executor_total_count,
    COALESCE(completion_reviewer_metrics.completion_reviewer_responded_count, 0::bigint) AS completion_reviewer_responded_count,
    COALESCE(completion_reviewer_metrics.completion_reviewer_total_count, 0::bigint) AS completion_reviewer_total_count,
    COALESCE(streak_metrics.current_streak_count, 0::bigint) AS current_streak_count
   FROM profiles
     LEFT JOIN user_reputation ON user_reputation.user_id = profiles.id
     LEFT JOIN stats ON stats.executor_id = profiles.id
     LEFT JOIN deal_metrics ON deal_metrics.executor_id = profiles.id
     LEFT JOIN counterparty_metrics ON counterparty_metrics.executor_id = profiles.id
     LEFT JOIN completion_executor_metrics ON completion_executor_metrics.executor_id = profiles.id
     LEFT JOIN completion_reviewer_metrics ON completion_reviewer_metrics.profile_id = profiles.id
     LEFT JOIN streak_metrics ON streak_metrics.executor_id = profiles.id
  WHERE profiles.handle IS NOT NULL AND profiles.is_public_profile IS TRUE;

GRANT SELECT ON public.public_profile_stats TO anon, authenticated;

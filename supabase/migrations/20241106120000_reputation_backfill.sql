-- Ensure promisee_id exists for executor resolution
ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS promisee_id uuid REFERENCES auth.users(id);

-- Compute reputation from promises for executor only
CREATE OR REPLACE VIEW public.reputation_scores_by_user AS
WITH executor_promises AS (
  SELECT
    p.id,
    p.title,
    p.status,
    p.due_at,
    p.completed_at,
    p.confirmed_at,
    p.disputed_at,
    p.created_at,
    CASE
      WHEN p.promisor_id IS NOT NULL THEN p.promisor_id
      WHEN p.promisee_id IS NOT NULL THEN NULL
      ELSE p.creator_id
    END AS executor_id,
    (p.due_at IS NOT NULL AND p.completed_at IS NOT NULL AND p.completed_at <= p.due_at) AS on_time,
    (p.due_at IS NOT NULL AND p.completed_at IS NOT NULL AND p.completed_at > p.due_at) AS late
  FROM promises p
  WHERE p.status IN ('confirmed', 'disputed')
)
SELECT
  executor_id AS user_id,
  SUM(
    CASE
      WHEN status = 'confirmed' THEN CASE WHEN on_time THEN 4 ELSE 3 END
      WHEN status = 'disputed' THEN CASE WHEN late THEN -7 ELSE -6 END
      ELSE 0
    END
  ) AS score_delta,
  COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_count,
  COUNT(*) FILTER (WHERE status = 'disputed') AS disputed_count,
  COUNT(*) FILTER (WHERE status = 'confirmed' AND on_time) AS on_time_count,
  COUNT(*) FILTER (WHERE status IN ('confirmed', 'disputed')) AS total_promises_completed
FROM executor_promises
WHERE executor_id IS NOT NULL
GROUP BY executor_id;

CREATE OR REPLACE FUNCTION public.rebuild_reputation_from_promises()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM reputation_events
  WHERE kind IN ('promise_confirmed', 'promise_disputed');

  WITH executor_promises AS (
    SELECT
      p.id,
      p.title,
      p.status,
      p.due_at,
      p.completed_at,
      p.confirmed_at,
      p.disputed_at,
      p.created_at,
      CASE
        WHEN p.promisor_id IS NOT NULL THEN p.promisor_id
        WHEN p.promisee_id IS NOT NULL THEN NULL
        ELSE p.creator_id
      END AS executor_id,
      (p.due_at IS NOT NULL AND p.completed_at IS NOT NULL AND p.completed_at <= p.due_at) AS on_time,
      (p.due_at IS NOT NULL AND p.completed_at IS NOT NULL AND p.completed_at > p.due_at) AS late
    FROM promises p
    WHERE p.status IN ('confirmed', 'disputed')
  )
  INSERT INTO reputation_events (user_id, promise_id, kind, delta, meta, created_at)
  SELECT
    executor_id,
    id,
    CASE WHEN status = 'confirmed' THEN 'promise_confirmed' ELSE 'promise_disputed' END,
    CASE
      WHEN status = 'confirmed' THEN CASE WHEN on_time THEN 4 ELSE 3 END
      WHEN status = 'disputed' THEN CASE WHEN late THEN -7 ELSE -6 END
      ELSE 0
    END,
    jsonb_strip_nulls(
      jsonb_build_object(
        'promise_title', title,
        'completed_at', completed_at,
        'confirmed_at', confirmed_at,
        'disputed_at', disputed_at,
        'due_at', due_at,
        'on_time', CASE WHEN status = 'confirmed' THEN on_time ELSE NULL END,
        'late_penalty', CASE WHEN status = 'disputed' THEN late ELSE NULL END
      )
    ),
    COALESCE(confirmed_at, disputed_at, completed_at, created_at, now())
  FROM executor_promises
  WHERE executor_id IS NOT NULL;

  DELETE FROM user_reputation;

  INSERT INTO user_reputation (
    user_id,
    score,
    confirmed_count,
    disputed_count,
    on_time_count,
    total_promises_completed,
    updated_at
  )
  SELECT
    user_id,
    GREATEST(0, LEAST(100, 50 + SUM(delta))),
    COUNT(*) FILTER (WHERE kind = 'promise_confirmed'),
    COUNT(*) FILTER (WHERE kind = 'promise_disputed'),
    COUNT(*) FILTER (WHERE kind = 'promise_confirmed' AND (meta->>'on_time')::boolean IS TRUE),
    COUNT(*) FILTER (WHERE kind IN ('promise_confirmed', 'promise_disputed')),
    now()
  FROM reputation_events
  GROUP BY user_id;
END;
$$;

SELECT public.rebuild_reputation_from_promises();

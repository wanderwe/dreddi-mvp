-- Self-Commitments ("Personal Goals") — standalone feature, fully separate
-- from promises / reputation / trust score.

CREATE TABLE IF NOT EXISTS public.self_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  deadline timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS self_commitments_user_created_idx
  ON public.self_commitments(user_id, created_at);

CREATE TABLE IF NOT EXISTS public.self_commitment_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id uuid NOT NULL REFERENCES public.self_commitments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS self_commitment_updates_commitment_created_idx
  ON public.self_commitment_updates(commitment_id, created_at, id);

ALTER TABLE public.self_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_commitment_updates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'self_commitments' AND policyname = 'self_commitments_owner_all'
  ) THEN
    CREATE POLICY self_commitments_owner_all ON public.self_commitments
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'self_commitments' AND policyname = 'self_commitments_public_read'
  ) THEN
    CREATE POLICY self_commitments_public_read ON public.self_commitments
      FOR SELECT
      USING (visibility = 'public');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'self_commitment_updates' AND policyname = 'self_commitment_updates_owner_all'
  ) THEN
    CREATE POLICY self_commitment_updates_owner_all ON public.self_commitment_updates
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.self_commitments c
          WHERE c.id = self_commitment_updates.commitment_id
            AND c.user_id = auth.uid()
        )
      )
      WITH CHECK (
        auth.uid() = author_id
        AND EXISTS (
          SELECT 1 FROM public.self_commitments c
          WHERE c.id = self_commitment_updates.commitment_id
            AND c.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'self_commitment_updates' AND policyname = 'self_commitment_updates_public_read'
  ) THEN
    CREATE POLICY self_commitment_updates_public_read ON public.self_commitment_updates
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.self_commitments c
          WHERE c.id = self_commitment_updates.commitment_id
            AND c.visibility = 'public'
        )
      );
  END IF;
END $$;

-- Per-user setting: whether public-profile goal stats are computed from
-- public goals only (default), or from all of the user's goals.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goals_stats_scope text NOT NULL DEFAULT 'public_only'
    CHECK (goals_stats_scope IN ('public_only', 'all'));

-- Aggregate "Personal Goals" stats for a user, computed independently of the
-- reputation/trust-score system. When p_public_only is true, only goals with
-- visibility = 'public' are considered.
CREATE OR REPLACE FUNCTION public.get_self_commitment_stats(p_user_id uuid, p_public_only boolean)
RETURNS TABLE (
  total_goals int,
  completed_goals int,
  failed_goals int,
  completion_rate numeric,
  current_streak int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed int;
  v_failed int;
  v_total int;
  v_streak int := 0;
  v_status text;
BEGIN
  SELECT
    count(*) FILTER (WHERE status = 'completed'),
    count(*) FILTER (WHERE status = 'failed'),
    count(*)
  INTO v_completed, v_failed, v_total
  FROM public.self_commitments c
  WHERE c.user_id = p_user_id
    AND (NOT p_public_only OR c.visibility = 'public');

  FOR v_status IN
    SELECT c.status
    FROM public.self_commitments c
    WHERE c.user_id = p_user_id
      AND (NOT p_public_only OR c.visibility = 'public')
      AND c.status IN ('completed', 'failed')
    ORDER BY c.created_at DESC
  LOOP
    IF v_status = 'completed' THEN
      v_streak := v_streak + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    v_total,
    v_completed,
    v_failed,
    CASE WHEN (v_completed + v_failed) > 0
      THEN round(v_completed::numeric / (v_completed + v_failed), 4)
      ELSE NULL
    END,
    v_streak;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_self_commitment_stats(uuid, boolean) TO authenticated, anon;

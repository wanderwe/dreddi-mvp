CREATE TABLE IF NOT EXISTS public.agreement_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.promises(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agreement_id, user_id)
);

CREATE INDEX IF NOT EXISTS agreement_followers_user_created_idx
  ON public.agreement_followers(user_id, created_at DESC);

ALTER TABLE public.agreement_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY agreement_followers_self_select
  ON public.agreement_followers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY agreement_followers_self_insert
  ON public.agreement_followers
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.promises p
      WHERE p.id = agreement_followers.agreement_id
        AND p.visibility = 'public'
    )
  );

CREATE POLICY agreement_followers_self_delete
  ON public.agreement_followers
  FOR DELETE
  USING (auth.uid() = user_id);

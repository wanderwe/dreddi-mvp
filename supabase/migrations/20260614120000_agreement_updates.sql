CREATE TABLE IF NOT EXISTS public.agreement_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.promises(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agreement_updates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS agreement_updates_agreement_created_idx
  ON public.agreement_updates(agreement_id, created_at, id);

CREATE POLICY agreement_updates_public_read_public_agreements
  ON public.agreement_updates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.promises p
      WHERE p.id = agreement_updates.agreement_id
        AND p.visibility = 'public'
    )
  );

CREATE POLICY agreement_updates_participant_insert
  ON public.agreement_updates
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1
      FROM public.promises p
      WHERE p.id = agreement_updates.agreement_id
        AND p.visibility = 'public'
        AND (
          auth.uid() = p.creator_id
          OR auth.uid() = public.resolve_promise_executor_id(
            p.promisor_id,
            p.promisee_id,
            p.counterparty_id,
            p.creator_id
          )
        )
    )
  );

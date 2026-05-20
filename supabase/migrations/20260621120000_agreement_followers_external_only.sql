ALTER TABLE public.agreement_followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agreement_followers_self_insert ON public.agreement_followers;

CREATE POLICY agreement_followers_self_insert
  ON public.agreement_followers
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.promises p
      WHERE p.id = agreement_followers.agreement_id
        AND p.visibility = 'public'
        AND auth.uid() <> p.creator_id
        AND auth.uid() IS DISTINCT FROM p.counterparty_id
        AND auth.uid() IS DISTINCT FROM p.promisor_id
        AND auth.uid() IS DISTINCT FROM p.promisee_id
        AND auth.uid() IS DISTINCT FROM public.resolve_promise_executor_id(
          p.promisor_id,
          p.promisee_id,
          p.counterparty_id,
          p.creator_id
        )
    )
  );

DELETE FROM public.agreement_followers af
USING public.promises p
WHERE p.id = af.agreement_id
  AND (
    af.user_id = p.creator_id
    OR af.user_id IS NOT DISTINCT FROM p.counterparty_id
    OR af.user_id IS NOT DISTINCT FROM p.promisor_id
    OR af.user_id IS NOT DISTINCT FROM p.promisee_id
    OR af.user_id IS NOT DISTINCT FROM public.resolve_promise_executor_id(
      p.promisor_id,
      p.promisee_id,
      p.counterparty_id,
      p.creator_id
    )
  );

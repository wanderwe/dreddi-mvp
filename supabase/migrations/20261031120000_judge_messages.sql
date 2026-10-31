-- AI judge case log: every appeal to the judge and every judge reply, attached to a promise.
-- The server writes rows (service role) after checking that the author takes part in the promise,
-- so nobody can forge a judge verdict straight through the API. Participants can read their case.
-- Evidence photos are not stored: the judge describes each piece of evidence in evidence_notes,
-- and those notes carry the evidence into later sessions of the same case.

CREATE TABLE IF NOT EXISTS public.judge_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id uuid NOT NULL REFERENCES public.promises(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_role text NOT NULL CHECK (author_role IN ('promisor', 'counterparty', 'judge')),
  phase text NOT NULL CHECK (phase IN ('criteria', 'verdict')),
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 4000),
  evidence_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  criteria jsonb,
  criteria_ready boolean,
  verdict text CHECK (verdict IN ('kept', 'not_kept', 'undecided')),
  confidence real,
  reasons jsonb,
  model text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- The judge has no author; a side's author_id turns null only if that profile is deleted.
  CHECK (author_role <> 'judge' OR author_id IS NULL)
);

ALTER TABLE public.judge_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS judge_messages_promise_created_idx
  ON public.judge_messages(promise_id, created_at, id);

CREATE POLICY judge_messages_participant_select
  ON public.judge_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.promises p
      WHERE p.id = judge_messages.promise_id
        AND auth.uid() IN (p.creator_id, p.promisor_id, p.promisee_id, p.counterparty_id)
    )
  );

-- No insert, update or delete policies: only the service role writes the case log.

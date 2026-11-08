-- «Дредді розсуди»: a quick dispute without an agreement. Two sides, signed in or anonymous, state a question
-- and their positions, each may answer once, and Dreddi gives a verdict that can be shared.
-- Only the server reads and writes these tables (service role), like judge_messages: RLS is on with no policies.
-- An anonymous side is known by a random token in an httpOnly cookie; only its sha256 is stored here.

CREATE TABLE IF NOT EXISTS public.quick_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  lang text NOT NULL DEFAULT 'uk' CHECK (lang IN ('uk', 'en')),
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 300),
  -- A new wording proposed by side B, waiting for side A to accept it.
  question_proposed text CHECK (question_proposed IS NULL OR char_length(question_proposed) BETWEEN 1 AND 300),
  question_confirmed_at timestamptz,
  status text NOT NULL DEFAULT 'awaiting_b'
    CHECK (status IN ('awaiting_b', 'awaiting_question', 'rebuttals', 'deciding', 'decided', 'expired')),
  -- Random, in the link side B opens to join.
  invite_token text NOT NULL UNIQUE,
  -- The public verdict card; set once there is a verdict.
  share_slug text UNIQUE,
  -- Who created it, hashed (user id or anonymous token) and their IP, hashed: for the daily limits only.
  creator_key text NOT NULL,
  creator_ip_hash text,
  -- When both positions were in: after 24 hours either side may ask for the verdict without a rebuttal.
  positions_done_at timestamptz,
  verdict jsonb,
  verdict_model text,
  input_tokens integer,
  output_tokens integer,
  web_searches integer,
  cost_usd numeric(10, 5),
  decided_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.quick_dispute_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.quick_disputes(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('A', 'B')),
  -- Null while the side is anonymous; set when they sign in and save the dispute.
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nickname text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 60),
  secret_hash text,
  position text CHECK (position IS NULL OR char_length(position) BETWEEN 1 AND 2000),
  position_at timestamptz,
  rebuttal text CHECK (rebuttal IS NULL OR char_length(rebuttal) BETWEEN 1 AND 1000),
  rebuttal_at timestamptz,
  rebuttal_skipped boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dispute_id, role),
  CHECK (user_id IS NOT NULL OR secret_hash IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS quick_dispute_parties_user_idx ON public.quick_dispute_parties(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quick_dispute_parties_secret_idx ON public.quick_dispute_parties(secret_hash) WHERE secret_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS quick_disputes_creator_idx ON public.quick_disputes(creator_key, created_at);
CREATE INDEX IF NOT EXISTS quick_disputes_ip_idx ON public.quick_disputes(creator_ip_hash, created_at);
CREATE INDEX IF NOT EXISTS quick_disputes_decided_idx ON public.quick_disputes(decided_at);

ALTER TABLE public.quick_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_dispute_parties ENABLE ROW LEVEL SECURITY;

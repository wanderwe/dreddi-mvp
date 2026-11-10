-- «Хто правий?» for a chat: one link, a situation and two positions; anyone with the link takes a side and
-- may say why, and once it closes Dreddi says who is right, even if that is the minority.
-- Only the server reads and writes these tables (service role): RLS is on with no policies.
-- Everyone appears under a random nickname; an anonymous browser is known by the sha256 of its cookie token.

CREATE TABLE IF NOT EXISTS public.quick_chat_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  lang text NOT NULL DEFAULT 'uk' CHECK (lang IN ('uk', 'en')),
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 300),
  position_1 text NOT NULL CHECK (char_length(position_1) BETWEEN 1 AND 200),
  position_2 text NOT NULL CHECK (char_length(position_2) BETWEEN 1 AND 200),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'deciding', 'decided', 'closed_empty')),
  -- Random, in the link everyone opens; the page and its card live there.
  token text NOT NULL UNIQUE,
  -- Null: the creator closes it by hand.
  closes_at timestamptz,
  closed_at timestamptz,
  -- The creator, to let them close it: their account, or their browser's token hash.
  creator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_secret_hash text,
  -- Hashed (user id or anonymous token) and the IP, hashed: for the daily limits only.
  creator_key text NOT NULL,
  creator_ip_hash text,
  verdict jsonb,
  verdict_model text,
  input_tokens integer,
  output_tokens integer,
  web_searches integer,
  cost_usd numeric(10, 5),
  decided_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.quick_chat_sides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.quick_chat_disputes(id) ON DELETE CASCADE,
  position smallint NOT NULL CHECK (position IN (1, 2)),
  argument text CHECK (argument IS NULL OR char_length(argument) BETWEEN 1 AND 280),
  nickname text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 60),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  secret_hash text NOT NULL,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One side per browser, and per account across browsers.
  UNIQUE (dispute_id, secret_hash)
);

CREATE UNIQUE INDEX IF NOT EXISTS quick_chat_sides_user_uniq ON public.quick_chat_sides(dispute_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quick_chat_sides_user_idx ON public.quick_chat_sides(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quick_chat_sides_secret_idx ON public.quick_chat_sides(secret_hash);
CREATE INDEX IF NOT EXISTS quick_chat_sides_ip_idx ON public.quick_chat_sides(dispute_id, ip_hash);
CREATE INDEX IF NOT EXISTS quick_chat_disputes_creator_idx ON public.quick_chat_disputes(creator_key, created_at);
CREATE INDEX IF NOT EXISTS quick_chat_disputes_ip_idx ON public.quick_chat_disputes(creator_ip_hash, created_at);
CREATE INDEX IF NOT EXISTS quick_chat_disputes_creator_user_idx ON public.quick_chat_disputes(creator_user_id) WHERE creator_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quick_chat_disputes_creator_secret_idx ON public.quick_chat_disputes(creator_secret_hash);
CREATE INDEX IF NOT EXISTS quick_chat_disputes_decided_idx ON public.quick_chat_disputes(decided_at);

ALTER TABLE public.quick_chat_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_chat_sides ENABLE ROW LEVEL SECURITY;

-- The product log learns the chat dispute's events.
ALTER TABLE public.product_events DROP CONSTRAINT IF EXISTS product_events_name_check;
ALTER TABLE public.product_events ADD CONSTRAINT product_events_name_check CHECK (name IN (
  'promise_invite_open',
  'dispute_invite_open',
  'dispute_share',
  'dispute_card_view',
  'dispute_card_share',
  'dispute_card_start_own',
  'chat_dispute_open',
  'chat_dispute_side',
  'chat_dispute_share'
));

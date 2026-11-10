-- Every paid model call for disputes and the bot, with what it cost: the daily budget sums this, and the
-- bot counts its parse attempts per group and per person here, failed ones too.
-- Only the server reads and writes it (service role): RLS is on with no policies.
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('quick_verdict', 'quick_review', 'chat_verdict', 'tg_parse')),
  cost_usd numeric(10, 5) NOT NULL DEFAULT 0,
  -- Hashed: the Telegram group and person a parse was for.
  chat_key text,
  user_key text
);

CREATE INDEX IF NOT EXISTS ai_usage_created_idx ON public.ai_usage(created_at);
CREATE INDEX IF NOT EXISTS ai_usage_chat_idx ON public.ai_usage(chat_key, created_at) WHERE chat_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS ai_usage_user_idx ON public.ai_usage(user_key, created_at) WHERE user_key IS NOT NULL;

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

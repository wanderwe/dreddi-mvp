-- «Дредді, розсуди!» in Telegram: a chat dispute can live in a Telegram group. The same tables as the
-- chat dispute on the site; the bot posts the dispute, people tap a side, reply with why, and the verdict
-- goes back to the group. People there show under their Telegram names; on the site, under nicknames.

ALTER TABLE public.quick_chat_disputes
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'telegram')),
  ADD COLUMN IF NOT EXISTS tg_chat_id bigint,
  -- The bot's message with the dispute: the draft first, then the dispute itself.
  ADD COLUMN IF NOT EXISTS tg_message_id bigint,
  ADD COLUMN IF NOT EXISTS tg_creator_name text,
  -- How many sides the message shows: the tick brings it up to date when a quick edit was refused.
  ADD COLUMN IF NOT EXISTS tg_shown_count integer;

-- A draft: the bot parsed the message and waits for the author to pick when it closes.
ALTER TABLE public.quick_chat_disputes DROP CONSTRAINT IF EXISTS quick_chat_disputes_status_check;
ALTER TABLE public.quick_chat_disputes ADD CONSTRAINT quick_chat_disputes_status_check
  CHECK (status IN ('draft', 'open', 'deciding', 'decided', 'closed_empty'));

CREATE UNIQUE INDEX IF NOT EXISTS quick_chat_disputes_tg_message_uniq
  ON public.quick_chat_disputes(tg_chat_id, tg_message_id) WHERE tg_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quick_chat_disputes_tg_chat_idx
  ON public.quick_chat_disputes(tg_chat_id, created_at) WHERE tg_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quick_chat_disputes_due_idx
  ON public.quick_chat_disputes(closes_at) WHERE status = 'open';

-- The nickname a Telegram participant gets on the site, where their Telegram name never shows.
ALTER TABLE public.quick_chat_sides
  ADD COLUMN IF NOT EXISTS web_nickname text CHECK (web_nickname IS NULL OR char_length(web_nickname) BETWEEN 1 AND 60);

-- Telegram may send an update again: each is handled once.
CREATE TABLE IF NOT EXISTS public.telegram_updates (
  update_id bigint PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_updates ENABLE ROW LEVEL SECURITY;

-- The product log learns the bot's events.
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
  'chat_dispute_share',
  'tg_bot_added',
  'tg_dispute_create',
  'tg_dispute_side',
  'tg_dispute_argument',
  'tg_dispute_verdict'
));

-- Every 5 minutes: close the chat disputes whose time is up (from the site and from Telegram), so the
-- verdict reaches the group on time. The endpoint only does what is already due, so it needs no secret.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chat_disputes_tick') THEN
    PERFORM cron.schedule(
      'chat_disputes_tick',
      '*/5 * * * *',
      $job$SELECT net.http_post(url := 'https://dreddi.com/api/chat-disputes/tick', body := '{}'::jsonb, timeout_milliseconds := 60000);$job$
    );
  END IF;
END;
$$;

-- Old update ids are only needed for a little while.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'telegram_updates_cleanup') THEN
    PERFORM cron.schedule(
      'telegram_updates_cleanup',
      '30 3 * * *',
      $job$DELETE FROM public.telegram_updates WHERE created_at < now() - interval '2 days';$job$
    );
  END IF;
END;
$$;

-- The bot's «Опишіть суперечку…» questions: each holds a reply open for the person who asked (force_reply)
-- until answered, even days later. The bot deletes a question once it is answered, and unanswered ones
-- after 15 minutes (the chat disputes tick), which closes that reply.
CREATE TABLE IF NOT EXISTS public.telegram_prompts (
  chat_id bigint NOT NULL,
  message_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, message_id)
);
CREATE INDEX IF NOT EXISTS telegram_prompts_created_idx ON public.telegram_prompts(created_at);
ALTER TABLE public.telegram_prompts ENABLE ROW LEVEL SECURITY;

-- «Не бачу двох позицій» is a question too: the person replies with who claims what, and Dreddi reads
-- that together with what they first wrote, kept here.
ALTER TABLE public.telegram_prompts ADD COLUMN IF NOT EXISTS context text;

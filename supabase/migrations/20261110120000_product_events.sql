-- A minimal log of what can't be read from other tables: opening an invite, viewing a public verdict card,
-- tapping share. Written only by the server (service role); nobody reads it through the API.

CREATE TABLE IF NOT EXISTS public.product_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL CHECK (name IN (
    'promise_invite_open',
    'dispute_invite_open',
    'dispute_share',
    'dispute_card_view',
    'dispute_card_share',
    'dispute_card_start_own'
  )),
  ref text NOT NULL CHECK (char_length(ref) <= 64),
  -- A random id the browser keeps, to count people and not page loads. Not tied to an account.
  visitor text CHECK (char_length(visitor) <= 64),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_events_name_created_idx ON public.product_events (name, created_at);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

-- Reputation model tables
CREATE TABLE IF NOT EXISTS user_reputation (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  score int NOT NULL DEFAULT 50,
  confirmed_count int NOT NULL DEFAULT 0,
  disputed_count int NOT NULL DEFAULT 0,
  on_time_count int NOT NULL DEFAULT 0,
  total_promises_completed int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reputation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  promise_id uuid NOT NULL REFERENCES public.promises(id),
  kind text NOT NULL,
  delta int NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, promise_id, kind)
);

CREATE INDEX IF NOT EXISTS reputation_events_user_idx ON reputation_events(user_id);
CREATE INDEX IF NOT EXISTS reputation_events_promise_idx ON reputation_events(promise_id);

ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_reputation' AND policyname = 'own_reputation_read'
  ) THEN
    CREATE POLICY own_reputation_read ON user_reputation
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reputation_events' AND policyname = 'own_reputation_events_read'
  ) THEN
    CREATE POLICY own_reputation_events_read ON reputation_events
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

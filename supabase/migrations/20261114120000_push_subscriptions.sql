-- Devices that get push notifications (the installed site now; Capacitor apps later).
-- One row per browser or phone: a person can have several. Only the server touches this table
-- (service role, through /api/push/subscribe and sendPush): RLS is on with no policies, so the
-- browser's own key can neither read nor write it.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The push service address of the device; unique, so subscribing again updates the same row.
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;

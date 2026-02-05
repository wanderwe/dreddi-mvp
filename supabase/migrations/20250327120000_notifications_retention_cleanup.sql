CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.cleanup_notifications_retention()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE read_at IS NOT NULL
    AND read_at < now() - interval '60 days';

  DELETE FROM public.notifications
  WHERE read_at IS NULL
    AND created_at < now() - interval '180 days';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'notifications_retention_cleanup'
  ) THEN
    PERFORM cron.schedule(
      'notifications_retention_cleanup',
      '0 3 * * *',
      $$SELECT public.cleanup_notifications_retention();$$
    );
  END IF;
END;
$$;

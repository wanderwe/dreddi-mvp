-- The site lives on www.dreddi.com and dreddi.com redirects there; a scheduled call does not follow a
-- redirect, so the 5-minute tick calls www directly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chat_disputes_tick') THEN
    PERFORM cron.unschedule('chat_disputes_tick');
  END IF;
  PERFORM cron.schedule(
    'chat_disputes_tick',
    '*/5 * * * *',
    $job$SELECT net.http_post(url := 'https://www.dreddi.com/api/chat-disputes/tick', body := '{}'::jsonb, timeout_milliseconds := 60000);$job$
  );
END;
$$;

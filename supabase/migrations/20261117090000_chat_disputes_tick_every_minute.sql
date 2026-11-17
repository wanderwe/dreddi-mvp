-- The bot shows when a dispute closes to the minute («о 22:47»); a tick every 5 minutes closed it up to
-- 5 minutes late. Every minute instead: with no dispute due, a call is one small query.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chat_disputes_tick') THEN
    PERFORM cron.unschedule('chat_disputes_tick');
  END IF;
  PERFORM cron.schedule(
    'chat_disputes_tick',
    '* * * * *',
    $job$SELECT net.http_post(url := 'https://www.dreddi.com/api/chat-disputes/tick', body := '{}'::jsonb, timeout_milliseconds := 60000);$job$
  );
END;
$$;

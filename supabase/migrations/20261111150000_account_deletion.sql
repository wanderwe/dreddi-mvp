-- Account deletion from the profile: a request hides the account for 30 days, a sign-in during that
-- time restores it, and after it a daily purge removes the account. Deals with other people stay with
-- them: the deleted side is handed to one tombstone account shown as "Deleted account", because a null
-- side means "invite not accepted yet" all over the app.

-- 1. The grace period. deletion_was_public keeps the public-profile toggle to put back on restore.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_was_public boolean;

CREATE INDEX IF NOT EXISTS profiles_deleted_at_idx
  ON public.profiles(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Only the server (service role) moves these columns: a signed-in person could otherwise backdate
-- deleted_at and have the purge run at once.
CREATE OR REPLACE FUNCTION public.profiles_guard_deletion_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('authenticated', 'anon') THEN
    NEW.deleted_at := OLD.deleted_at;
    NEW.deletion_was_public := OLD.deletion_was_public;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_deletion_columns ON public.profiles;
CREATE TRIGGER profiles_guard_deletion_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_deletion_columns();

-- 2. Sign in with Apple tokens, kept only to revoke them when the account is deleted (App Store asks
-- for it). Server only: RLS on and no policies.
CREATE TABLE IF NOT EXISTS public.apple_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token text,
  access_token text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apple_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.apple_tokens FROM anon, authenticated;

-- 3. Apple's server-to-server notifications name the person by their Apple user id (sub).
CREATE OR REPLACE FUNCTION public.find_user_id_by_apple_sub(p_sub text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT i.user_id
  FROM auth.identities i
  WHERE i.provider = 'apple' AND i.provider_id = p_sub
  LIMIT 1;
$$;

-- Signs a person out everywhere: a revoked Apple consent, or a deletion request.
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM auth.refresh_tokens WHERE user_id = p_user::text;
  DELETE FROM auth.sessions WHERE user_id = p_user;
END;
$$;

-- 4. The purge, in one transaction. auth.admin.deleteUser runs right after it, from the server.
CREATE OR REPLACE FUNCTION public.purge_account_data(p_user uuid, p_tombstone uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_solo uuid[];
  v_shared integer;
BEGIN
  IF p_user IS NULL OR p_tombstone IS NULL OR p_user = p_tombstone THEN
    RAISE EXCEPTION 'purge_account_data: bad arguments';
  END IF;

  -- Deals with no other person (or only the tombstone, from an earlier deletion) go.
  SELECT coalesce(array_agg(p.id), '{}')
  INTO v_solo
  FROM public.promises p
  WHERE p_user IN (p.creator_id, p.promisor_id, p.promisee_id, p.counterparty_id)
    AND coalesce(p.creator_id, p_user) IN (p_user, p_tombstone)
    AND coalesce(p.promisor_id, p_user) IN (p_user, p_tombstone)
    AND coalesce(p.promisee_id, p_user) IN (p_user, p_tombstone)
    AND coalesce(p.counterparty_id, p_user) IN (p_user, p_tombstone);

  DELETE FROM public.reputation_events WHERE promise_id = ANY (v_solo);
  DELETE FROM public.promises WHERE id = ANY (v_solo);

  -- Deals with other people stay; the deleted side becomes the tombstone.
  UPDATE public.promises SET
    creator_id = CASE WHEN creator_id = p_user THEN p_tombstone ELSE creator_id END,
    promisor_id = CASE WHEN promisor_id = p_user THEN p_tombstone ELSE promisor_id END,
    promisee_id = CASE WHEN promisee_id = p_user THEN p_tombstone ELSE promisee_id END,
    counterparty_id = CASE WHEN counterparty_id = p_user THEN p_tombstone ELSE counterparty_id END,
    condition_met_by = CASE WHEN condition_met_by = p_user THEN p_tombstone ELSE condition_met_by END,
    disputed_by = CASE WHEN disputed_by = p_user THEN p_tombstone ELSE disputed_by END,
    condition_proposed_by = CASE WHEN condition_proposed_by = p_user THEN p_tombstone ELSE condition_proposed_by END,
    condition_responsible_id = CASE WHEN condition_responsible_id = p_user THEN p_tombstone ELSE condition_responsible_id END
  WHERE p_user IN (
    creator_id, promisor_id, promisee_id, counterparty_id,
    condition_met_by, disputed_by, condition_proposed_by, condition_responsible_id
  );
  GET DIAGNOSTICS v_shared = ROW_COUNT;

  -- What the person wrote in shared deals stays, under the tombstone (a null author is Dreddi itself).
  UPDATE public.agreement_updates SET author_id = p_tombstone WHERE author_id = p_user;
  UPDATE public.judge_messages SET author_id = p_tombstone WHERE author_id = p_user;

  DELETE FROM public.collective_agreements c
  WHERE c.creator_id = p_user
    AND NOT EXISTS (SELECT 1 FROM public.promises p WHERE p.collective_agreement_id = c.id);
  UPDATE public.collective_agreements SET creator_id = p_tombstone WHERE creator_id = p_user;

  -- Disputes keep their record without the person.
  UPDATE public.quick_dispute_parties SET user_id = NULL WHERE user_id = p_user;
  UPDATE public.quick_chat_sides SET user_id = NULL WHERE user_id = p_user;
  UPDATE public.quick_chat_disputes SET creator_user_id = NULL WHERE creator_user_id = p_user;
  UPDATE public.feedback
    SET user_id = NULL, user_email = NULL, user_handle_or_name = NULL
    WHERE user_id = p_user;

  -- Everything that was only theirs.
  DELETE FROM public.notification_email_sends WHERE user_id = p_user;
  DELETE FROM public.notifications WHERE user_id = p_user;
  DELETE FROM public.deal_invites WHERE inviter_id = p_user OR invitee_id = p_user;
  DELETE FROM public.deal_reminders WHERE sender_id = p_user OR receiver_id = p_user;
  DELETE FROM public.agreement_followers WHERE user_id = p_user;
  DELETE FROM public.promise_groups WHERE owner_user_id = p_user;
  DELETE FROM public.self_commitment_updates
    WHERE author_id = p_user
       OR commitment_id IN (SELECT id FROM public.self_commitments WHERE user_id = p_user);
  DELETE FROM public.self_commitments WHERE user_id = p_user;
  DELETE FROM public.reputation_events WHERE user_id = p_user;
  DELETE FROM public.user_reputation WHERE user_id = p_user;
  DELETE FROM public.social_links WHERE user_id = p_user;
  DELETE FROM public.admin_users WHERE id = p_user;
  DELETE FROM public.ai_usage WHERE user_key = p_user::text;
  DELETE FROM public.profiles WHERE id = p_user;

  RETURN jsonb_build_object('deleted_deals', coalesce(array_length(v_solo, 1), 0), 'kept_deals', v_shared);
END;
$$;

REVOKE ALL ON FUNCTION public.find_user_id_by_apple_sub(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_user_sessions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_account_data(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_apple_sub(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_account_data(uuid, uuid) TO service_role;

-- 5. Once a day the site purges the accounts whose 30 days are over. The endpoint only touches those,
-- so an extra call does nothing. www, because a scheduled call does not follow the apex redirect.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'account_purge') THEN
    PERFORM cron.unschedule('account_purge');
  END IF;
  PERFORM cron.schedule(
    'account_purge',
    '17 3 * * *',
    $job$SELECT net.http_post(url := 'https://www.dreddi.com/api/account/purge', body := '{}'::jsonb, timeout_milliseconds := 120000);$job$
  );
END;
$$;

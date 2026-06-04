-- Social links: verified OAuth accounts attached to a Dreddi profile.
-- One row per (user, platform). Populated automatically after OAuth linkIdentity.

CREATE TABLE public.social_links (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        text        NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'github', 'facebook')),
  platform_user_id text       NOT NULL,   -- opaque sub/id from the provider
  username        text,                   -- @handle (twitter) or profile slug
  display_name    text,                   -- full name from the provider
  verified_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

-- Owner can read their own links
CREATE POLICY "social_links_owner_select"
  ON public.social_links FOR SELECT
  USING (auth.uid() = user_id);

-- Owner can insert (upsert) their own links
CREATE POLICY "social_links_owner_insert"
  ON public.social_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owner can update their own links
CREATE POLICY "social_links_owner_update"
  ON public.social_links FOR UPDATE
  USING (auth.uid() = user_id);

-- Owner can delete (disconnect) their own links
CREATE POLICY "social_links_owner_delete"
  ON public.social_links FOR DELETE
  USING (auth.uid() = user_id);

-- Anyone can read social links that belong to public profiles
CREATE POLICY "social_links_public_select"
  ON public.social_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = social_links.user_id
        AND profiles.is_public_profile = true
    )
  );

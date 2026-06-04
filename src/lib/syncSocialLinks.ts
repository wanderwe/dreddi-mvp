import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Providers we treat as social verification (not just login). */
const SOCIAL_PROVIDERS = ["twitter", "linkedin_oidc"] as const;
type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

const isSocialProvider = (p: string): p is SocialProvider =>
  SOCIAL_PROVIDERS.includes(p as SocialProvider);

/** Maps Supabase provider name → our `platform` column value. */
const toPlatform = (provider: SocialProvider): string =>
  provider === "linkedin_oidc" ? "linkedin" : provider;

/**
 * Upserts a row in `social_links` for every OAuth identity the user has
 * that we recognise as a social verification source (Twitter, LinkedIn).
 *
 * Safe to call repeatedly — uses ON CONFLICT DO UPDATE.
 */
export async function syncSocialLinks(
  supabase: SupabaseClient,
  user: User
): Promise<void> {
  const identities = (user.identities ?? []).filter((i) =>
    isSocialProvider(i.provider)
  );

  if (identities.length === 0) return;

  for (const identity of identities) {
    const provider = identity.provider as SocialProvider;
    const platform = toPlatform(provider);
    const data = (identity.identity_data ?? {}) as Record<string, string | undefined>;

    const platformUserId =
      identity.id ||
      data["sub"] ||
      data["user_id"] ||
      data["id"] ||
      "";

    if (!platformUserId) continue;

    // Twitter: preferred_username = @handle (without the @)
    // LinkedIn OIDC: no public username, just name + email
    const username =
      data["preferred_username"] ??
      data["user_name"] ??
      data["login"] ??
      null;

    const displayName =
      data["full_name"] ??
      data["name"] ??
      (data["given_name"] && data["family_name"]
        ? `${data["given_name"]} ${data["family_name"]}`
        : data["given_name"]) ??
      null;

    await supabase.from("social_links").upsert(
      {
        user_id: user.id,
        platform,
        platform_user_id: platformUserId,
        username,
        display_name: displayName,
        verified_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" }
    );
  }
}

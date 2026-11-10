import { supabaseOptional as supabase } from "@/lib/supabaseClient";

type ProfileSource = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

// Apple's "Hide My Email" hands out addresses like abc123@privaterelay.appleid.com:
// their local part is random, so it makes a meaningless handle.
const isRelayEmail = (email: string) =>
  email.toLowerCase().endsWith("@privaterelay.appleid.com");

// The name an OAuth provider gave us (Google every time, Apple only on the first sign-in),
// kept only if it fits profiles_display_name_length_check (2 to 40 characters).
function nameFromMetadata(meta: Record<string, unknown> | null | undefined): string | null {
  if (!meta) return null;
  const pick = (key: string) => {
    const value = meta[key];
    return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  };
  const name = pick("full_name") || pick("name");
  return name.length >= 2 && name.length <= 40 ? name : null;
}

function buildHandle(user: ProfileSource, name: string | null): string {
  const fallback = `user_${user.id.slice(0, 6)}`;
  const email = user.email ?? null;
  if (email && !isRelayEmail(email)) return email.split("@")[0].toLowerCase();
  if (email && name) {
    const slug = name
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    // An id suffix, because names repeat far more often than email addresses.
    if (slug) return `${slug}_${user.id.slice(0, 4)}`;
  }
  return fallback;
}

export async function upsertProfile(user: ProfileSource) {
  if (!supabase) return;
  const name = nameFromMetadata(user.user_metadata);
  const handle = buildHandle(user, name);

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id,handle,display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError) throw existingProfileError;

  if (existingProfile) {
    const updatePayload: { email: string | null; handle?: string; display_name?: string } = {
      email: user.email ?? null,
    };

    if (!existingProfile.handle) {
      updatePayload.handle = handle;
    }

    if (!existingProfile.display_name && name) {
      updatePayload.display_name = name;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email ?? null,
    display_name: name,
    handle,
    avatar_url: null,
  });

  if (error) throw error;
}

import { supabaseOptional as supabase } from "@/lib/supabaseClient";

export async function upsertProfile(user: { id: string; email?: string | null }) {
  if (!supabase) return;
  const handle =
    user.email?.split("@")[0].toLowerCase() ?? `user_${user.id.slice(0, 6)}`;

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id,handle")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError) throw existingProfileError;

  if (existingProfile) {
    const updatePayload: { email: string | null; handle?: string } = {
      email: user.email ?? null,
    };

    if (!existingProfile.handle) {
      updatePayload.handle = handle;
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
    display_name: null,
    handle,
    avatar_url: null,
  });

  if (error) throw error;
}

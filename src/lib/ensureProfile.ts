import { supabase } from "@/lib/supabaseClient";

export async function upsertProfile(user: { id: string; email?: string | null }) {
  const handle =
    user.email?.split("@")[0].toLowerCase() ?? `user_${user.id.slice(0, 6)}`;

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email ?? null,
    display_name: user.email ?? "User",
    handle,
    avatar_url: null,
  });

  if (error) throw error;
}

import type { SupabaseClient } from "@supabase/supabase-js";

export const fetchUnreadNotificationCount = async (
  supabase: SupabaseClient,
  userId: string
) => {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  return count ?? 0;
};

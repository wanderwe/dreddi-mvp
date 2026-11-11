import type { SupabaseClient } from "@supabase/supabase-js";
import { revokeAppleTokens } from "@/lib/account/apple";
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  ACTIVE_DEAL_STATUSES,
  DELETED_ACCOUNT_ID,
  accountDeletesAt,
} from "@/lib/account/constants";

type DeletionProfile = {
  deleted_at: string | null;
  is_public_profile: boolean | null;
  deletion_was_public: boolean | null;
};

// Deals still in progress where someone else is a side: the confirmation dialog shows how many.
export async function countActiveSharedDeals(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("promises")
    .select("creator_id,promisor_id,promisee_id,counterparty_id")
    .or(
      `creator_id.eq.${userId},promisor_id.eq.${userId},promisee_id.eq.${userId},counterparty_id.eq.${userId}`
    )
    .in("status", [...ACTIVE_DEAL_STATUSES]);
  if (error) throw error;

  return (data ?? []).filter((row) =>
    [row.creator_id, row.promisor_id, row.promisee_id, row.counterparty_id].some(
      (id) => id && id !== userId && id !== DELETED_ACCOUNT_ID
    )
  ).length;
}

// Starts the grace period: the profile leaves public pages and search, and every session ends.
export async function requestAccountDeletion(admin: SupabaseClient, userId: string) {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("deleted_at,is_public_profile,deletion_was_public")
    .eq("id", userId)
    .maybeSingle<DeletionProfile>();
  if (error) throw error;
  if (!profile) throw new Error("Profile not found");

  if (profile.deleted_at) {
    return { deletesAt: accountDeletesAt(profile.deleted_at), alreadyRequested: true };
  }

  const deletedAt = new Date();
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      deleted_at: deletedAt.toISOString(),
      deletion_was_public: profile.is_public_profile ?? true,
      is_public_profile: false,
    })
    .eq("id", userId);
  if (updateError) throw updateError;

  const { error: sessionsError } = await admin.rpc("revoke_user_sessions", { p_user: userId });
  if (sessionsError) console.error("[account] revoke_sessions_failed", { userId, error: sessionsError.message });

  return { deletesAt: accountDeletesAt(deletedAt), alreadyRequested: false };
}

export async function restoreAccount(admin: SupabaseClient, userId: string) {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("deleted_at,is_public_profile,deletion_was_public")
    .eq("id", userId)
    .maybeSingle<DeletionProfile>();
  if (error) throw error;
  if (!profile?.deleted_at) return { restored: false };

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      deleted_at: null,
      deletion_was_public: null,
      is_public_profile: profile.deletion_was_public ?? true,
    })
    .eq("id", userId);
  if (updateError) throw updateError;
  return { restored: true };
}

// The tombstone is a real auth user with a profile, so every foreign key keeps working.
async function ensureDeletedAccount(admin: SupabaseClient) {
  const { data: existing } = await admin.auth.admin.getUserById(DELETED_ACCOUNT_ID);
  if (!existing?.user) {
    const { error } = await admin.auth.admin.createUser({
      id: DELETED_ACCOUNT_ID,
      email: "deleted-account@deleted.dreddi.invalid",
      email_confirm: true,
      ban_duration: "876000h",
      user_metadata: { system: "deleted_account" },
    });
    if (error && !/already/i.test(error.message)) throw error;
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: DELETED_ACCOUNT_ID,
      email: null,
      display_name: "Deleted account",
      handle: null,
      avatar_url: null,
      is_public_profile: false,
      email_notifications_enabled: false,
      push_notifications_enabled: false,
    },
    { onConflict: "id" }
  );
  if (profileError) throw profileError;
}

// Removes the account for good: Apple tokens revoked, own data deleted, shared deals handed to the
// tombstone (all in purge_account_data), then the auth user itself.
export async function purgeAccount(admin: SupabaseClient, userId: string) {
  if (userId === DELETED_ACCOUNT_ID) throw new Error("Refusing to purge the tombstone account");

  await ensureDeletedAccount(admin);
  await revokeAppleTokens(admin, userId);

  const { data: summary, error } = await admin.rpc("purge_account_data", {
    p_user: userId,
    p_tombstone: DELETED_ACCOUNT_ID,
  });
  if (error) throw error;

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) throw deleteError;

  console.info("[account] purged", { userId, ...(summary as Record<string, unknown>) });
  return summary as { deleted_deals: number; kept_deals: number };
}

export async function purgeDueAccounts(admin: SupabaseClient, limit = 25) {
  const cutoff = new Date(Date.now() - ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .lt("deleted_at", cutoff)
    .neq("id", DELETED_ACCOUNT_ID)
    .order("deleted_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
  for (const row of data ?? []) {
    try {
      await purgeAccount(admin, row.id);
      results.push({ userId: row.id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[account] purge_failed", { userId: row.id, error: message });
      results.push({ userId: row.id, ok: false, error: message });
    }
  }
  return results;
}

import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { publicProfileDetailSelect } from "@/lib/publicProfileQueries";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { getPromiseUiStatus } from "@/lib/promiseUiStatus";

export type PublicPassportProfile = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  reputation_score: number | null;
  confirmed_count: number | null;
  disputed_count: number | null;
  completed_count: number | null;
  dispute_rate: number | null;
  unique_counterparties_count: number | null;
  deals_with_due_date_count: number | null;
  on_time_completion_count: number | null;
  total_confirmed_deals: number | null;
  reputation_age_days: number | null;
  avg_deals_per_month: number | null;
  completion_executor_marked_count: number | null;
  completion_executor_total_count: number | null;
  completion_reviewer_responded_count: number | null;
  completion_reviewer_total_count: number | null;
};

type PublicPromiseRow = {
  status: string | null;
  invite_status: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  declined_at: string | null;
  accepted_at: string | null;
  counterparty_accepted_at: string | null;
  ignored_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
};

export type PublicPassportPromise = {
  status: PromiseStatus;
  confirmed_at: string | null;
  disputed_at: string | null;
};

const getPublicProfileStats = async (handle: string) => {
  if (!supabase) {
    return {
      data: null,
      error: { message: "Supabase client is not available." },
    };
  }

  return supabase
    .from("public_profile_stats")
    .select(publicProfileDetailSelect)
    .eq("handle", handle)
    .maybeSingle();
};

export const getPublicPassportData = async (handle: string) => {
  if (!supabase) {
    return { data: null, error: "supabase" as const };
  }

  const { data: profileRow, error: profileErr } = await getPublicProfileStats(handle);
  if (profileErr || !profileRow) {
    return { data: null, error: "private" as const };
  }

  const { data, error: promisesErr } = await supabase.rpc("public_get_profile_public_promises", {
    p_handle: profileRow.handle,
    p_limit: 200,
  });

  if (promisesErr) {
    return {
      data: {
        profile: profileRow as PublicPassportProfile,
        promises: [] as PublicPassportPromise[],
      },
      error: null,
    };
  }

  const promiseRows = (data ?? []) as PublicPromiseRow[];
  const promises = promiseRows.flatMap((row) => {
    if (!isPromiseStatus(row.status)) return [];

    const uiStatus = getPromiseUiStatus({
      status: row.status,
      invite_status: row.invite_status,
      accepted_at: row.accepted_at,
      counterparty_accepted_at: row.counterparty_accepted_at,
      declined_at: row.declined_at,
      ignored_at: row.ignored_at,
      expires_at: row.expires_at,
      cancelled_at: row.cancelled_at,
    });

    if (uiStatus === "awaiting_acceptance" || uiStatus === "cancelled_by_creator" || uiStatus === "expired") {
      return [];
    }

    return [
      {
        status: row.status,
        confirmed_at: row.confirmed_at,
        disputed_at: row.disputed_at,
      },
    ];
  });

  return {
    data: {
      profile: profileRow as PublicPassportProfile,
      promises,
    },
    error: null,
  };
};

export const getPassportStreak = (promises: PublicPassportPromise[]) => {
  const finalizedDeals = promises
    .filter((promise) => promise.status === "confirmed" || promise.status === "disputed")
    .map((promise) => ({
      status: promise.status,
      finalizedAt: promise.confirmed_at ?? promise.disputed_at,
    }))
    .filter((promise) => Boolean(promise.finalizedAt))
    .sort((a, b) => {
      const aTime = a.finalizedAt ? new Date(a.finalizedAt).getTime() : 0;
      const bTime = b.finalizedAt ? new Date(b.finalizedAt).getTime() : 0;
      return bTime - aTime;
    });

  let currentStreak = 0;
  for (const deal of finalizedDeals) {
    if (deal.status !== "confirmed") break;
    currentStreak += 1;
  }

  return currentStreak;
};

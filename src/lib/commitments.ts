import { supabaseOptional as supabase } from "@/lib/supabaseClient";

export const COMMITMENT_STATUSES = ["active", "completed", "failed", "abandoned"] as const;
export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

export const COMMITMENT_VISIBILITIES = ["public", "private"] as const;
export type CommitmentVisibility = (typeof COMMITMENT_VISIBILITIES)[number];

export type SelfCommitment = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: CommitmentStatus;
  visibility: CommitmentVisibility;
  created_at: string;
  completed_at: string | null;
};

export type PublicSelfCommitment = SelfCommitment & {
  owner_display_name: string | null;
  owner_handle: string | null;
};

export type SelfCommitmentUpdate = {
  id: string;
  content: string;
  created_at: string;
};

export type SelfCommitmentStats = {
  total_goals: number;
  completed_goals: number;
  failed_goals: number;
  completion_rate: number | null;
  current_streak: number;
};

export async function getAuthHeaders(): Promise<HeadersInit | undefined> {
  const token = await supabase?.auth
    .getSession()
    .then(({ data }) => data.session?.access_token ?? null)
    .catch(() => null);

  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export const EMPTY_STATS: SelfCommitmentStats = {
  total_goals: 0,
  completed_goals: 0,
  failed_goals: 0,
  completion_rate: null,
  current_streak: 0,
};

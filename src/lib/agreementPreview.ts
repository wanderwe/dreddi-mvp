import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBindingOutcome } from "@/lib/ai/judgeRuling";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import { getPromiseUiStatus, type PromiseUiStatus } from "@/lib/promiseUiStatus";
import { isPromiseStatus } from "@/lib/promiseStatus";
import { getPublicProfileIdentity } from "@/lib/publicProfileIdentity";

// What a shared link to a public promise shows in messengers and social networks: the link preview
// (title, description, image). Only public promises, and only what their public page already shows.
const AGREEMENT_PREVIEW_REVALIDATE_SECONDS = 300;

export type AgreementPreviewData = {
  id: string;
  title: string;
  uiStatus: PromiseUiStatus;
  dueAt: string | null;
  executorName: string | null;
  verdict: "kept" | "not_kept" | null;
};

type PreviewRow = {
  id: string;
  title: string | null;
  status: string;
  invite_status: string | null;
  due_at: string | null;
  accepted_at: string | null;
  counterparty_accepted_at: string | null;
  declined_at: string | null;
  ignored_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  counterparty_id: string | null;
  promisor_id: string | null;
  promisee_id: string | null;
  creator_id: string;
};

const lookupAgreementPreviewCached = unstable_cache(
  async (id: string): Promise<AgreementPreviewData | null> => {
    const admin = supabaseAdmin();
    const { data: row, error } = await admin
      .from("promises")
      .select(
        "id,title,status,invite_status,due_at,accepted_at,counterparty_accepted_at,declined_at,ignored_at,expires_at,cancelled_at,counterparty_id,promisor_id,promisee_id,creator_id"
      )
      .eq("id", id)
      .eq("visibility", "public")
      .maybeSingle<PreviewRow>();
    if (error || !row?.title || !isPromiseStatus(row.status)) return null;

    const executorId = resolveExecutorId(row);
    const { data: profile } = executorId
      ? await admin
          .from("profiles")
          .select("display_name,handle,is_public_profile")
          .eq("id", executorId)
          .maybeSingle<{ display_name: string | null; handle: string | null; is_public_profile: boolean | null }>()
      : { data: null };
    const executorName = profile
      ? getPublicProfileIdentity({
          displayName: profile.display_name,
          handle: profile.is_public_profile ? profile.handle : null,
        }).title || null
      : null;

    const { data: judgeRows } = await admin
      .from("judge_messages")
      .select("author_role,content,verdict,created_at")
      .eq("promise_id", row.id)
      .eq("author_role", "judge")
      .order("created_at", { ascending: true });
    const outcome = judgeRows ? getBindingOutcome(judgeRows as Parameters<typeof getBindingOutcome>[0]) : null;

    return {
      id: row.id,
      title: row.title,
      uiStatus: getPromiseUiStatus({ ...row, status: row.status } as Parameters<typeof getPromiseUiStatus>[0]),
      dueAt: row.due_at,
      executorName,
      verdict: outcome?.verdict === "kept" || outcome?.verdict === "not_kept" ? outcome.verdict : null,
    };
  },
  ["agreement-preview-by-id"],
  { revalidate: AGREEMENT_PREVIEW_REVALIDATE_SECONDS }
);

export async function lookupAgreementPreview(id: string) {
  return lookupAgreementPreviewCached(id);
}

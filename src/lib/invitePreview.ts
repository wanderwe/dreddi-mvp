import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const INVITE_PREVIEW_REVALIDATE_SECONDS = 600;

type InvitePreviewRow = {
  title: string | null;
};

export type InvitePreviewData = {
  title: string;
};

const lookupInvitePreviewCached = unstable_cache(
  async (token: string): Promise<InvitePreviewData | null> => {
    const trimmed = token.trim();
    if (!trimmed) return null;

    const { data, error } = await supabaseAdmin()
      .from("promises")
      .select("title")
      .eq("invite_token", trimmed)
      .maybeSingle<InvitePreviewRow>();

    if (error || !data?.title) {
      return null;
    }

    return {
      title: data.title,
    };
  },
  ["invite-preview-title-by-token"],
  { revalidate: INVITE_PREVIEW_REVALIDATE_SECONDS }
);

export async function lookupInvitePreview(token: string) {
  return lookupInvitePreviewCached(token);
}

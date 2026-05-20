import type { SupabaseClient } from "@supabase/supabase-js";

type AgreementParticipantShape = {
  creator_id: string;
  counterparty_id: string | null;
  promisor_id: string | null;
  promisee_id: string | null;
};

export function getAgreementParticipantIds(agreement: AgreementParticipantShape): Set<string> {
  return new Set(
    [agreement.creator_id, agreement.counterparty_id, agreement.promisor_id, agreement.promisee_id].filter(
      (value): value is string => Boolean(value)
    )
  );
}

export async function removeAgreementFollower(
  admin: SupabaseClient,
  agreementId: string,
  userId: string
) {
  return admin.from("agreement_followers").delete().eq("agreement_id", agreementId).eq("user_id", userId);
}


import type { SupabaseClient } from "@supabase/supabase-js";
import { getAgreementParticipantIds } from "@/lib/agreements/followers";
import { buildDedupeKey, createNotification } from "@/lib/notifications/service";
import type { NotificationType } from "@/lib/notifications/types";

type WatcherEventType =
  | "public_agreement_accepted"
  | "public_agreement_completed"
  | "public_agreement_fulfilled"
  | "public_agreement_disputed"
  | "public_agreement_updated"
  | "public_agreement_deadline";

type AgreementWatcherContext = {
  id: string;
  creator_id: string;
  counterparty_id: string | null;
  promisor_id: string | null;
  promisee_id: string | null;
};

export async function notifyAgreementWatchers(
  admin: SupabaseClient,
  agreement: AgreementWatcherContext,
  eventType: WatcherEventType,
  options?: { actorId?: string | null; eventId?: string | null }
) {
  const participantIds = getAgreementParticipantIds(agreement);
  const excluded = new Set<string>(participantIds);
  if (options?.actorId) excluded.add(options.actorId);

  const { data: followers, error } = await admin
    .from("agreement_followers")
    .select("user_id")
    .eq("agreement_id", agreement.id);

  if (error) {
    console.error("[notifications] watcher_lookup_failed", {
      agreementId: agreement.id,
      eventType,
      error: error.message,
    });
    return;
  }

  const watcherIds = Array.from(
    new Set((followers ?? []).map((row) => row.user_id).filter((id) => id && !excluded.has(id)))
  );

  for (const watcherId of watcherIds) {
    await createNotification(admin, {
      userId: watcherId,
      promiseId: agreement.id,
      type: eventType as NotificationType,
      dedupeKey: buildDedupeKey([eventType, agreement.id, watcherId, options?.eventId ?? "base"]),
      ctaUrl: `/p/agreements/${agreement.id}`,
      priority: "normal",
    });
  }
}

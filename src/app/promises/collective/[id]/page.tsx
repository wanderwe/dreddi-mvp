"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { productFlags } from "@/lib/config/productFlags";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { StatusPill, StatusPillTone } from "@/app/components/ui/StatusPill";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";
import { getPromiseUiStatus, PromiseUiStatus } from "@/lib/promiseUiStatus";
import { PromiseStatus } from "@/lib/promiseStatus";

type AgreementRow = {
  id: string;
  title: string;
  details: string | null;
  created_at: string;
  creator_id: string;
};

type ParticipantRow = {
  promiseId: string;
  uiStatus: PromiseUiStatus;
  handle: string | null;
  displayName: string | null;
};

const statusTone: Record<PromiseUiStatus, StatusPillTone> = {
  active: "neutral",
  completed_by_promisor: "attention",
  confirmed: "success",
  disputed: "danger",
  awaiting_acceptance: "neutral",
  awaiting_creator_confirmation: "attention",
  declined: "danger",
  expired: "neutral",
  cancelled_by_creator: "neutral",
};

export default function CollectiveAgreementDetailPage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const agreementId = params?.id;

  useEffect(() => {
    if (!productFlags.collectiveAgreements) {
      router.replace(localizePath("/promises", locale));
    }
  }, [router, locale]);

  const [agreement, setAgreement] = useState<AgreementRow | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [roster, setRoster] = useState<ParticipantRow[]>([]);
  const [ownPromiseId, setOwnPromiseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" });

  useEffect(() => {
    if (!agreementId) return;
    let active = true;

    const load = async () => {
      setError(null);
      let supabase;
      try {
        supabase = requireSupabase();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Authentication is unavailable.");
          setLoading(false);
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        window.location.href = localizeLoginPath(localizePath(`/promises/collective/${agreementId}`, locale), locale);
        return;
      }

      const { data: agreementRow, error: agreementError } = await supabase
        .from("collective_agreements")
        .select("id,title,details,created_at,creator_id")
        .eq("id", agreementId)
        .maybeSingle();

      if (!active) return;

      if (agreementError || !agreementRow) {
        setError(t("collectiveAgreements.detail.notFound"));
        setLoading(false);
        return;
      }

      setAgreement(agreementRow);
      const creator = agreementRow.creator_id === session.user.id;
      setIsCreator(creator);

      const { data: promiseRows, error: promisesError } = await supabase
        .from("promises")
        .select("id,status,invite_status,invited_at,accepted_at,declined_at,ignored_at,expires_at,cancelled_at,counterparty_accepted_at,counterparty_id,promisor_id,promisee_id")
        .eq("collective_agreement_id", agreementId);

      if (!active) return;
      if (promisesError) {
        setError(promisesError.message);
        setLoading(false);
        return;
      }

      const rows = promiseRows ?? [];

      const ownRow = rows.find(
        (row) =>
          row.counterparty_id === session.user.id ||
          row.promisor_id === session.user.id ||
          row.promisee_id === session.user.id
      );
      setOwnPromiseId(ownRow?.id ?? null);

      if (creator) {
        const counterpartyIds = rows.map((row) => row.counterparty_id).filter(Boolean) as string[];
        const profilesById = new Map<string, { handle: string | null; display_name: string | null }>();

        if (counterpartyIds.length > 0) {
          const { data: profileRows } = await supabase
            .from("profiles")
            .select("id,handle,display_name")
            .in("id", counterpartyIds);

          for (const profile of profileRows ?? []) {
            profilesById.set(profile.id, { handle: profile.handle, display_name: profile.display_name });
          }
        }

        setRoster(
          rows.map((row) => {
            const profile = row.counterparty_id ? profilesById.get(row.counterparty_id) : undefined;
            return {
              promiseId: row.id,
              uiStatus: getPromiseUiStatus({ ...row, status: row.status as PromiseStatus }),
              handle: profile?.handle ?? null,
              displayName: profile?.display_name ?? null,
            };
          })
        );
      }

      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [agreementId, locale, t]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-sm text-slate-400">{t("collectiveAgreements.detail.loading")}</p>
      </main>
    );
  }

  if (error || !agreement) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="rounded-xl border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error ?? t("collectiveAgreements.detail.notFound")}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <LocalizedLink href="/promises" className="text-sm text-emerald-200 hover:text-emerald-100">
          ← {t("collectiveAgreements.detail.back")}
        </LocalizedLink>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-emerald-200">
          {t("collectiveAgreements.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{agreement.title}</h1>
        {agreement.details && <p className="mt-2 text-sm text-slate-300">{agreement.details}</p>}
        <p className="mt-2 text-xs text-slate-400">
          {t("collectiveAgreements.detail.createdAt", { date: dateFormatter.format(new Date(agreement.created_at)) })}
        </p>
      </div>

      {isCreator ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">
            {t("collectiveAgreements.detail.roster", { count: roster.length })}
          </h2>
          <ul className="space-y-2">
            {roster.map((participant) => (
              <li
                key={participant.promiseId}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <span className="min-w-0 truncate text-sm text-white">
                  {participant.displayName ?? (participant.handle ? `@${participant.handle}` : participant.promiseId)}
                  {participant.displayName && participant.handle ? ` · @${participant.handle}` : ""}
                </span>
                <StatusPill
                  label={t(`publicAgreement.status.${participant.uiStatus}`)}
                  tone={statusTone[participant.uiStatus]}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        ownPromiseId && (
          <section className="rounded-xl border border-white/10 bg-black/20 px-4 py-4">
            <p className="text-sm font-semibold text-white">{t("collectiveAgreements.detail.yourCopy")}</p>
            <LocalizedLink
              href={`/promises/${ownPromiseId}`}
              className="mt-2 inline-flex text-sm font-semibold text-emerald-200 hover:text-emerald-100"
            >
              {t("collectiveAgreements.detail.viewDeal")}
            </LocalizedLink>
          </section>
        )
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";

type CollectiveAgreementRow = {
  id: string;
  title: string;
  created_at: string;
  total: number;
  accepted: number;
  confirmed: number;
  disputed: number;
};

export default function CollectiveAgreementsPage() {
  const t = useT();
  const locale = useLocale();
  const [agreements, setAgreements] = useState<CollectiveAgreementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" });

  useEffect(() => {
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
        window.location.href = localizeLoginPath(localizePath("/promises/collective", locale), locale);
        return;
      }

      const { data, error: loadError } = await supabase
        .from("collective_agreements")
        .select("id,title,created_at")
        .eq("creator_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (loadError) {
        setError(loadError.message);
        setLoading(false);
        return;
      }

      const agreementsData = data ?? [];
      const agreementIds = agreementsData.map((a) => a.id);
      const counts = new Map<string, { total: number; accepted: number; confirmed: number; disputed: number }>();

      if (agreementIds.length > 0) {
        const { data: promiseRows, error: promisesError } = await supabase
          .from("promises")
          .select("collective_agreement_id,status,invite_status")
          .in("collective_agreement_id", agreementIds);

        if (promisesError) {
          setError(promisesError.message);
        } else {
          for (const row of promiseRows ?? []) {
            const id = row.collective_agreement_id as string;
            const entry = counts.get(id) ?? { total: 0, accepted: 0, confirmed: 0, disputed: 0 };
            entry.total += 1;
            if (row.invite_status === "accepted") entry.accepted += 1;
            if (row.status === "confirmed") entry.confirmed += 1;
            if (row.status === "disputed") entry.disputed += 1;
            counts.set(id, entry);
          }
        }
      }

      setAgreements(
        agreementsData.map((a) => ({
          ...a,
          ...(counts.get(a.id) ?? { total: 0, accepted: 0, confirmed: 0, disputed: 0 }),
        }))
      );
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [locale]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
              {t("collectiveAgreements.eyebrow")}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{t("collectiveAgreements.list.title")}</h1>
            <p className="mt-2 text-sm text-slate-300">{t("collectiveAgreements.list.subtitle")}</p>
          </div>
          <LocalizedLink
            href="/promises/collective/new"
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50"
          >
            {t("collectiveAgreements.list.cta")}
          </LocalizedLink>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">{t("collectiveAgreements.list.loading")}</p>
      ) : agreements.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-slate-300">
          <p className="font-semibold text-white">{t("collectiveAgreements.list.empty")}</p>
          <p className="mt-1 text-slate-400">{t("collectiveAgreements.list.emptyDescription")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {agreements.map((agreement) => (
            <li key={agreement.id}>
              <LocalizedLink
                href={`/promises/collective/${agreement.id}`}
                className="block cursor-pointer rounded-xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-emerald-300/40 hover:bg-white/5"
              >
                <p className="font-semibold text-white">{agreement.title}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {t("collectiveAgreements.list.createdAt", { date: dateFormatter.format(new Date(agreement.created_at)) })}
                  {" · "}
                  {t("collectiveAgreements.list.participants", { count: agreement.total })}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    {t("collectiveAgreements.list.progressAccepted", { accepted: agreement.accepted, total: agreement.total })}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    {t("collectiveAgreements.list.progressConfirmed", { confirmed: agreement.confirmed, total: agreement.total })}
                  </span>
                  {agreement.disputed > 0 && (
                    <span className="rounded-full border border-rose-300/30 bg-rose-500/10 px-2.5 py-1 text-rose-100">
                      {t("collectiveAgreements.list.progressDisputed", { disputed: agreement.disputed, total: agreement.total })}
                    </span>
                  )}
                </div>
              </LocalizedLink>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

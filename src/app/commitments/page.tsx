"use client";

import { useEffect, useState } from "react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { StatusPill, type StatusPillTone } from "@/app/components/ui/StatusPill";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { formatDueDate } from "@/lib/formatDueDate";
import {
  EMPTY_STATS,
  getAuthHeaders,
  type CommitmentStatus,
  type SelfCommitment,
  type SelfCommitmentStats,
} from "@/lib/commitments";

const statusTone: Record<CommitmentStatus, StatusPillTone> = {
  active: "attention",
  completed: "success",
  failed: "danger",
  abandoned: "neutral",
};

const metricValueClass = "mt-1 text-base font-semibold leading-tight text-white";
const metricBaseClass =
  "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left shadow-inner shadow-black/30";

export default function CommitmentsDashboardPage() {
  const t = useT();
  const locale = useLocale();
  const [goals, setGoals] = useState<SelfCommitment[]>([]);
  const [stats, setStats] = useState<SelfCommitmentStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const response = await fetch("/api/commitments", {
          method: "GET",
          credentials: "include",
          headers,
        });

        if (response.status === 401) {
          window.location.href = localizeLoginPath(localizePath("/commitments", locale), locale);
          return;
        }

        const payload = await response.json().catch(() => []);
        if (cancelled) return;
        if (!response.ok) {
          setError(typeof payload?.error === "string" ? payload.error : "Unexpected error");
          return;
        }

        const rows = Array.isArray(payload) ? (payload as SelfCommitment[]) : [];
        setGoals(rows);

        const session = await supabase?.auth.getSession();
        const userId = session?.data.session?.user.id;
        if (userId && supabase) {
          const { data: statsRows } = await supabase.rpc("get_self_commitment_stats", {
            p_user_id: userId,
            p_public_only: false,
          });
          const row = Array.isArray(statsRows) ? statsRows[0] : null;
          if (row && !cancelled) setStats(row as SelfCommitmentStats);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unexpected error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const completionRateLabel =
    stats.completion_rate === null ? "—" : `${Math.round(stats.completion_rate * 100)}%`;

  return (
    <main className="relative py-10">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(74,222,128,0.08),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(74,144,226,0.08),transparent_28%)]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-5xl space-y-5 px-4 sm:px-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-4 shadow-2xl shadow-black/40 backdrop-blur sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="text-xs uppercase tracking-[0.32em] text-emerald-200">
                {t("commitments.dashboard.eyebrow")}
              </div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">{t("commitments.dashboard.title")}</h1>
              <p className="text-sm text-slate-300">{t("commitments.dashboard.subtitle")}</p>
            </div>

            <div className="hidden shrink-0 sm:block">
              <LocalizedLink
                href="/commitments/new"
                className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50"
              >
                {t("commitments.dashboard.newGoal")}
              </LocalizedLink>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-slate-200 sm:grid-cols-4">
            <div className={metricBaseClass}>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {t("commitments.dashboard.stats.total")}
              </div>
              <div className={metricValueClass}>{stats.total_goals}</div>
            </div>
            <div className={metricBaseClass}>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {t("commitments.dashboard.stats.completed")}
              </div>
              <div className={metricValueClass}>{stats.completed_goals}</div>
            </div>
            <div className={metricBaseClass}>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {t("commitments.dashboard.stats.completionRate")}
              </div>
              <div className={metricValueClass}>{completionRateLabel}</div>
            </div>
            <div className={metricBaseClass}>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {t("commitments.dashboard.stats.streak")}
              </div>
              <div className={metricValueClass}>{stats.current_streak}</div>
            </div>
          </div>

          <LocalizedLink
            href="/commitments/new"
            className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 sm:hidden"
          >
            {t("commitments.dashboard.newGoal")}
          </LocalizedLink>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        <div className="rounded-3xl border border-white/10 bg-black/30 p-4 shadow-xl shadow-black/30 backdrop-blur">
          <div className="space-y-3">
            {loading &&
              [1, 2, 3].map((i) => <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-white/5" />)}
            {!loading && goals.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-slate-300">
                {t("commitments.dashboard.empty")}
              </div>
            )}
            {!loading &&
              goals.map((goal) => (
                <LocalizedLink
                  key={goal.id}
                  href={`/commitments/${goal.id}`}
                  className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-300/40 hover:bg-emerald-500/5 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-lg font-semibold text-white">{goal.title}</div>
                    <StatusPill
                      label={t(`commitments.dashboard.status.${goal.status}`)}
                      tone={statusTone[goal.status]}
                    />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>{t(`commitments.dashboard.visibility.${goal.visibility}`)}</span>
                    <span>
                      {goal.deadline
                        ? t("commitments.dashboard.deadline", { date: formatDueDate(goal.deadline, locale) ?? "" })
                        : t("commitments.dashboard.noDeadline")}
                    </span>
                  </div>
                </LocalizedLink>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}

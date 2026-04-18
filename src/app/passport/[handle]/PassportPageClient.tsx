"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { getPublicProfileIdentity } from "@/lib/publicProfileIdentity";
import { getLifetimePaceMetrics, getMonthlyPace } from "@/lib/paceMetrics";
import { getPassportStreak, getPublicPassportData, PublicPassportProfile } from "@/lib/passportData";

export default function PassportPageClient() {
  const params = useParams();
  const t = useT();
  const locale = useLocale();
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percentFormatter = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);
  const paceFormatter = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);

  const handle = useMemo(() => {
    const raw = params?.handle;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [profile, setProfile] = useState<PublicPassportProfile | null>(null);
  const [streak, setStreak] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadPassport = async () => {
      if (!handle) {
        setIsUnavailable(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await getPublicPassportData(handle);
      if (!active) return;

      if (!result.data) {
        setIsUnavailable(true);
        setProfile(null);
        setStreak(0);
        setLoading(false);
        return;
      }

      setIsUnavailable(false);
      setProfile(result.data.profile);
      setStreak(getPassportStreak(result.data.promises));
      setLoading(false);
    };

    void loadPassport();

    return () => {
      active = false;
    };
  }, [handle]);

  const identity = useMemo(
    () =>
      getPublicProfileIdentity({
        displayName: profile?.display_name,
        handle: profile?.handle,
      }),
    [profile?.display_name, profile?.handle]
  );

  const passportUrl = useMemo(() => {
    if (!origin || !handle) return "";
    return `${origin}/passport/${encodeURIComponent(handle)}`;
  }, [origin, handle]);

  const embedUrl = useMemo(() => {
    if (!origin || !handle) return "";
    return `${origin}/passport/${encodeURIComponent(handle)}/embed`;
  }, [origin, handle]);

  const embedCode = useMemo(() => {
    if (!embedUrl) return "";
    return `<iframe src=\"${embedUrl}\" width=\"420\" height=\"280\" style=\"border:0;\" loading=\"lazy\" title=\"Dreddi Reputation Passport\"></iframe>`;
  }, [embedUrl]);

  const copyToClipboard = async (value: string, onDone: (ok: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(value);
      onDone(true);
      window.setTimeout(() => onDone(false), 1800);
    } catch {
      onDone(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0f1a] px-6 py-14 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-white/70">
          {t("passport.loading")}
        </div>
      </main>
    );
  }

  if (isUnavailable || !profile) {
    return (
      <main className="min-h-screen bg-[#0b0f1a] px-6 py-14 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">Dreddi Passport</p>
          <h1 className="mt-4 text-2xl font-semibold">{t("passport.unavailableTitle")}</h1>
          <p className="mt-3 text-sm text-white/65">{t("passport.unavailable")}</p>
        </div>
      </main>
    );
  }

  const completed = profile.confirmed_count ?? 0;
  const disputed = profile.disputed_count ?? 0;
  const score = profile.reputation_score ?? 50;
  const totalDeals = profile.total_confirmed_deals ?? completed;
  const uniquePeople = profile.unique_counterparties_count ?? 0;
  const withDeadlines = profile.deals_with_due_date_count ?? 0;
  const onTime = profile.on_time_completion_count ?? 0;
  const completionRate =
    (profile.completion_executor_total_count ?? 0) > 0
      ? ((profile.completion_executor_marked_count ?? 0) / (profile.completion_executor_total_count ?? 0)) * 100
      : 0;
  const responseRate =
    (profile.completion_reviewer_total_count ?? 0) > 0
      ? ((profile.completion_reviewer_responded_count ?? 0) / (profile.completion_reviewer_total_count ?? 0)) * 100
      : 0;

  const paceFromProfile = profile.avg_deals_per_month;
  const lifetimePace = getLifetimePaceMetrics([]);
  const pace =
    typeof paceFromProfile === "number" && Number.isFinite(paceFromProfile)
      ? Number(paceFromProfile.toFixed(1))
      : getMonthlyPace(totalDeals, profile.reputation_age_days ?? lifetimePace.activeDays);

  return (
    <main className="min-h-screen bg-[#0b0f1a] px-6 py-10 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">{t("passport.label")}</p>
          <h1 className="mt-2 text-3xl font-semibold">{identity.title}</h1>
          {identity.subtitle ? <p className="mt-1 text-sm text-white/65">{identity.subtitle}</p> : null}
          <p className="mt-5 text-sm text-emerald-200/90">{t("passport.trustLine")}</p>
          <p className="mt-1 text-xs text-white/55">{t("passport.basedOnOutcomes")}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <StatCard label={t("passport.score")} value={numberFormatter.format(score)} />
            <StatCard label={t("passport.fulfilled")} value={numberFormatter.format(completed)} tone="emerald" />
            <StatCard label={t("passport.disputed")} value={numberFormatter.format(disputed)} tone="amber" />
            <StatCard label={t("passport.streak")} value={numberFormatter.format(streak)} />
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <DetailMetric title={t("passport.details.workedWith")} value={numberFormatter.format(uniquePeople)} subtitle={t("passport.details.partners")} />
            <DetailMetric title={t("passport.details.commitments")} value={numberFormatter.format(withDeadlines)} subtitle={t("passport.details.onTime", { count: numberFormatter.format(onTime) })} />
            <DetailMetric title={t("passport.details.disputes")} value={numberFormatter.format(disputed)} subtitle={t("passport.details.disputeRate", { rate: percentFormatter.format(profile.dispute_rate ?? 0) })} />
            <DetailMetric title={t("passport.details.dealPace")} value={paceFormatter.format(pace)} subtitle={t("passport.details.perMonth")} />
            <DetailMetric title={t("passport.details.completionRate")} value={`${percentFormatter.format(completionRate)}%`} subtitle={t("passport.details.outcomesConfirmed")} />
            <DetailMetric title={t("passport.details.response")} value={`${percentFormatter.format(responseRate)}%`} subtitle={t("passport.details.counterpartyResponses")} />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm text-white/75">{t("passport.shareHelper")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copyToClipboard(passportUrl, setCopiedLink)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-emerald-300/40 hover:text-emerald-100"
            >
              {copiedLink ? t("passport.copySuccess") : t("passport.copyLink")}
            </button>
            <button
              type="button"
              onClick={() => void copyToClipboard(embedCode, setCopiedEmbed)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-emerald-300/40 hover:text-emerald-100"
            >
              {copiedEmbed ? t("passport.copySuccess") : t("passport.copyEmbed")}
            </button>
          </div>
          <p className="mt-4 break-all rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60">{embedCode}</p>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-500/25 bg-emerald-500/10"
      : tone === "amber"
        ? "border-amber-400/25 bg-amber-400/10"
        : "border-white/10 bg-black/30";

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function DetailMetric({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs text-white/65">{title}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/50">{subtitle}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { getLandingCopy } from "@/lib/landingCopy";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { formatDealMeta } from "@/lib/formatDealMeta";
import { publicProfileDetailSelect } from "@/lib/publicProfileQueries";
import { getPublicProfileIdentity } from "@/lib/publicProfileIdentity";

type PublicProfileRow = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_tags: string[] | null;
  reputation_score: number | null;
  confirmed_count: number | null;
  completed_count: number | null;
  disputed_count: number | null;
  dispute_rate: number | null;
  last_activity_at: string | null;
  unique_counterparties_count: number | null;
  deals_with_new_people_count: number | null;
  deals_with_due_date_count: number | null;
  on_time_completion_count: number | null;
  total_confirmed_deals: number | null;
  reputation_age_days: number | null;
  avg_deals_per_month: number | null;
};

type PublicPromiseRow = {
  title: string | null;
  status: string | null;
  created_at: string | null;
  due_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
};

type PublicPromise = {
  title: string;
  status: PromiseStatus;
  created_at: string;
  due_at: string | null;
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

const statusTones: Record<PromiseStatus, string> = {
  active: "bg-white/5 text-emerald-200 border border-white/10",
  completed_by_promisor: "bg-amber-500/10 text-amber-100 border border-amber-300/40",
  confirmed: "bg-emerald-500/10 text-emerald-100 border border-emerald-300/40",
  disputed: "bg-red-500/10 text-red-100 border border-red-300/40",
  declined: "bg-red-500/10 text-red-100 border border-red-300/40",
};

export default function PublicProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const t = useT();
  const locale = useLocale();
  const landingCopy = getLandingCopy(locale);
  const handle = useMemo(() => {
    const raw = params?.handle;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);
  const backFrom = searchParams?.get("from");

  const [profile, setProfile] = useState<PublicProfileRow | null>(null);
  const [promises, setPromises] = useState<PublicPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [reputationDetailsOpen, setReputationDetailsOpen] = useState(false);

  const formatRelativeTime = useMemo(() => {
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    return (value: string) => {
      const now = Date.now();
      const time = new Date(value).getTime();
      if (Number.isNaN(time)) return null;
      const diffMinutes = (time - now) / (1000 * 60);
      const diffHours = diffMinutes / 60;
      const diffDays = diffHours / 24;

      if (Math.abs(diffMinutes) < 60) {
        return formatter.format(Math.round(diffMinutes), "minute");
      }
      if (Math.abs(diffHours) < 24) {
        return formatter.format(Math.round(diffHours), "hour");
      }
      return formatter.format(Math.round(diffDays), "day");
    };
  }, [locale]);

  const backLink = useMemo(() => {
    if (backFrom === "profiles") {
      return { href: "/u", label: t("publicProfile.backToDirectory") };
    }
    return { href: "/u", label: t("publicProfile.backToDirectory") };
  }, [backFrom, t]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!supabase) {
        setError(t("publicProfile.errors.supabase"));
        setLoading(false);
        return;
      }

      if (!handle) {
        setError(t("publicProfile.errors.missing"));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: profileRow, error: profileErr } = await getPublicProfileStats(handle);

      if (!active) return;

      if (profileErr || !profileRow) {
        setError(profileErr?.message ?? t("publicProfile.errors.private"));
        setLoading(false);
        return;
      }

      setProfile(profileRow as PublicProfileRow);
      if (process.env.NODE_ENV !== "production") {
        console.info("public profile on-time metrics", {
          handle: profileRow.handle,
          dealsWithDueDate: profileRow.deals_with_due_date_count,
          onTime: profileRow.on_time_completion_count,
        });
      }

      const { data, error: promisesErr } = await supabase.rpc(
        "public_get_profile_public_promises",
        {
          p_handle: profileRow.handle,
          p_limit: 200,
        }
      );
      const promiseRows = (data ?? []) as PublicPromiseRow[];

      if (!active) return;

      if (promisesErr) {
        setPromises([]);
      } else {
        const normalized: PublicPromise[] = promiseRows.flatMap((row) => {
          if (!row.title || !row.created_at || !isPromiseStatus(row.status)) return [];
          return [
            {
              title: row.title,
              status: row.status,
              created_at: row.created_at,
              due_at: row.due_at,
              confirmed_at: row.confirmed_at,
              disputed_at: row.disputed_at,
            },
          ];
        });
        setPromises(normalized);

        if (
          process.env.NODE_ENV !== "production" &&
          normalized.length > 0 &&
          !profileRow.last_activity_at
        ) {
          console.info("public_profile_stats missing last_activity_at despite promises", {
            handle: profileRow.handle,
            promiseCount: normalized.length,
          });
        }
      }

      setLoading(false);
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [handle, t]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const identity = useMemo(
    () =>
      getPublicProfileIdentity({
        displayName: profile?.display_name,
        handle: profile?.handle,
      }),
    [profile?.display_name, profile?.handle]
  );
  const primaryLabel = identity.title || profile?.handle || "";
  const avatarLabel = primaryLabel.replace(/^@/, "");
  const profileTags = profile?.profile_tags ?? [];
  const confirmedCount = profile?.confirmed_count ?? 0;
  const disputedCount = profile?.disputed_count ?? 0;
  const reputationScore = profile?.reputation_score ?? 50;
  const totalConfirmedDeals = profile?.total_confirmed_deals ?? confirmedCount;
  const lastActivityFromPromises = useMemo(() => {
    if (promises.length === 0) return null;
    const latestStatusChange = promises.reduce<string | null>((currentLatest, promise) => {
      const statusTimestamp = [promise.confirmed_at, promise.disputed_at].reduce<string | null>(
        (latest, timestamp) => {
          if (!timestamp) return latest;
          if (!latest) return timestamp;
          return new Date(timestamp).getTime() > new Date(latest).getTime() ? timestamp : latest;
        },
        null
      );
      if (!statusTimestamp) return currentLatest;
      if (!currentLatest) return statusTimestamp;
      return new Date(statusTimestamp).getTime() > new Date(currentLatest).getTime()
        ? statusTimestamp
        : currentLatest;
    }, null);

    if (latestStatusChange) return latestStatusChange;

    return promises.reduce<string | null>((currentLatest, promise) => {
      if (!promise.created_at) return currentLatest;
      if (!currentLatest) return promise.created_at;
      return new Date(promise.created_at).getTime() > new Date(currentLatest).getTime()
        ? promise.created_at
        : currentLatest;
    }, null);
  }, [promises]);
  const lastActivityAt = profile?.last_activity_at ?? lastActivityFromPromises;
  const publicProfilePath = useMemo(
    () => (handle ? `/u/${encodeURIComponent(handle)}` : ""),
    [handle]
  );
  const publicProfileUrl = origin && publicProfilePath ? `${origin}${publicProfilePath}` : "";

  const handleCopyLink = async () => {
    if (!publicProfileUrl) return;
    try {
      await navigator.clipboard.writeText(publicProfileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const statusLabels: Partial<Record<PromiseStatus, string>> = {
    active: t("publicProfile.status.inProgress"),
    completed_by_promisor: t("publicProfile.status.awaitingOutcome"),
    confirmed: landingCopy.recentDeals.status.confirmed,
    disputed: landingCopy.recentDeals.status.disputed,
    declined: landingCopy.recentDeals.status.declined,
  };

  const publicDealsEmpty = promises.length === 0;
  const streakCount = useMemo(() => {
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
  }, [promises]);
  const lastActivityRelative = lastActivityAt ? formatRelativeTime(lastActivityAt) : null;
  const lastActivityLabel = lastActivityAt
    ? t("publicProfile.summary.lastActivity", { time: lastActivityRelative ?? "—" })
    : t("publicProfile.summary.lastActivityEmpty");
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const decimalFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale]
  );
  const percentFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale]
  );
  const pluralRules = useMemo(() => new Intl.PluralRules(locale), [locale]);
  const formatPlural = (count: number, key: string) => {
    const rule = pluralRules.select(count);
    return (
      t(`publicProfile.reputationDetails.labels.${key}.${rule}`) ||
      t(`publicProfile.reputationDetails.labels.${key}.other`)
    );
  };
  const reputationEvidence = useMemo(() => {
    const totalDeals = totalConfirmedDeals ?? 0;
    const hasDeals = totalDeals > 0;
    const uniquePeople = profile?.unique_counterparties_count ?? null;
    const dealsWithDeadlines = profile?.deals_with_due_date_count ?? null;
    const onTimeCompletions = profile?.on_time_completion_count ?? null;
    const disputes = profile?.disputed_count ?? null;
    const disputeRate = profile?.dispute_rate ?? null;
    const reputationAgeDays = profile?.reputation_age_days ?? null;
    const avgDealsPerMonth = profile?.avg_deals_per_month ?? null;

    return {
      totalDeals,
      hasDeals,
      uniquePeople,
      dealsWithDeadlines,
      onTimeCompletions,
      disputes,
      disputeRate,
      reputationAgeDays,
      avgDealsPerMonth,
    };
  }, [
    profile?.avg_deals_per_month,
    profile?.deals_with_due_date_count,
    profile?.dispute_rate,
    profile?.disputed_count,
    profile?.on_time_completion_count,
    profile?.reputation_age_days,
    profile?.unique_counterparties_count,
    totalConfirmedDeals,
  ]);
  const dealMetaLabels = useMemo(
    () => ({
      created: (date: string) => t("deal.meta.created", { date }),
      due: (date: string) => t("deal.meta.due", { date }),
      closed: (date: string) => t("deal.meta.closed", { date }),
    }),
    [t]
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0b0f1a] text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
        <Link
          href={backLink.href}
          className="text-sm font-medium text-emerald-200 transition hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a]"
        >
          {backLink.label}
        </Link>
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/70">
            {t("publicProfile.loading")}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/70">
            {error}
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/10">
                    {profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt={primaryLabel}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-semibold text-white/80">
                        {avatarLabel.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-semibold truncate">{primaryLabel}</h1>
                    {identity.subtitle && (
                      <p className="text-sm text-white/60 truncate">{identity.subtitle}</p>
                    )}
                    {profileTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {profileTags.map((tag) => (
                          <span
                            key={tag}
                            tabIndex={0}
                            className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-slate-200/90 transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-emerald-300/40 hover:bg-white/10 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] sm:w-auto"
                >
                  {copied ? t("profileSettings.copySuccess") : t("publicProfile.copyLink")}
                </button>
              </div>
              <div className="text-xs text-white/50">{lastActivityLabel}</div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/80 shadow-inner shadow-black/30">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/60">
                    {t("publicProfile.reputationScore")}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">{reputationScore}</div>
                </div>
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100 shadow-inner shadow-black/30">
                  <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                    {t("publicProfile.confirmed")}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">{confirmedCount}</div>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-50 shadow-inner shadow-black/30">
                  <div className="text-xs uppercase tracking-[0.2em] text-amber-200">
                    {t("publicProfile.disputed")}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">{disputedCount}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-white">🔥</span>
                  <p className="text-2xl font-semibold text-white">
                    {t("publicProfile.streak.title", { count: numberFormatter.format(streakCount) })}
                  </p>
                </div>
                <p className="mt-1 text-xs text-white/60">
                  {streakCount === 0
                    ? t("publicProfile.streak.zero")
                    : t("publicProfile.streak.nonZero", {
                        count: numberFormatter.format(streakCount),
                      })}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <button
                type="button"
                onClick={() => setReputationDetailsOpen((prev) => !prev)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a]"
                aria-label={
                  reputationDetailsOpen
                    ? t("publicProfile.reputationDetails.collapseLabel")
                    : t("publicProfile.reputationDetails.expandLabel")
                }
                aria-expanded={reputationDetailsOpen}
              >
                <div>
                  <h2 className="text-lg font-semibold">
                    {t("publicProfile.reputationDetails.title")}
                  </h2>
                </div>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 transition-transform duration-200 ${
                    reputationDetailsOpen ? "rotate-180" : "rotate-0"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25" />
                  </svg>
                </span>
              </button>
              <div
                className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
                  reputationDetailsOpen ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="pt-5">
                  {!reputationEvidence.hasDeals ? (
                    <p className="text-sm text-white/60">
                      {t("publicProfile.reputationDetails.empty")}
                    </p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {reputationEvidence.uniquePeople !== null && (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <h3 className="text-sm font-semibold text-white">
                            {t("publicProfile.reputationDetails.sections.workedWith")}
                          </h3>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-baseline gap-2 text-white">
                              <span className="text-2xl font-semibold">
                                {numberFormatter.format(reputationEvidence.uniquePeople)}
                              </span>
                              <span className="text-sm text-white/70">
                                {formatPlural(
                                  reputationEvidence.uniquePeople,
                                  "people"
                                )}
                              </span>
                            </div>
                            {reputationEvidence.totalDeals > 0 && (
                              <p className="text-xs text-white/60">
                                {t("publicProfile.reputationDetails.workedWith.secondary", {
                                  count: numberFormatter.format(reputationEvidence.totalDeals),
                                  label: formatPlural(reputationEvidence.totalDeals, "deals"),
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {(reputationEvidence.dealsWithDeadlines !== null ||
                        reputationEvidence.onTimeCompletions !== null) && (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <h3 className="text-sm font-semibold text-white">
                            {t("publicProfile.reputationDetails.sections.commitments")}
                          </h3>
                          <div className="mt-2 space-y-2">
                            {reputationEvidence.dealsWithDeadlines !== null && (
                              <div className="flex items-baseline gap-2 text-white">
                                <span className="text-2xl font-semibold">
                                  {numberFormatter.format(reputationEvidence.dealsWithDeadlines)}
                                </span>
                                <span className="text-sm text-white/70">
                                  {formatPlural(
                                    reputationEvidence.dealsWithDeadlines,
                                    "deadlines"
                                  )}
                                </span>
                              </div>
                            )}
                            {reputationEvidence.onTimeCompletions !== null && (
                              <p className="text-xs text-white/60">
                                {t("publicProfile.reputationDetails.commitments.onTime", {
                                  count: numberFormatter.format(
                                    reputationEvidence.onTimeCompletions
                                  ),
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {reputationEvidence.disputes !== null && (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <h3 className="text-sm font-semibold text-white">
                            {t("publicProfile.reputationDetails.sections.disputes")}
                          </h3>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-baseline gap-2 text-white">
                              <span className="text-2xl font-semibold">
                                {numberFormatter.format(reputationEvidence.disputes)}
                              </span>
                              <span className="text-sm text-white/70">
                                {formatPlural(reputationEvidence.disputes, "disputes")}
                              </span>
                            </div>
                            {reputationEvidence.totalDeals > 0 &&
                              reputationEvidence.disputeRate !== null && (
                                <p className="text-xs text-white/60">
                                  {t("publicProfile.reputationDetails.disputes.rate", {
                                    rate: percentFormatter.format(reputationEvidence.disputeRate),
                                  })}
                                </p>
                              )}
                          </div>
                        </div>
                      )}
                      {(reputationEvidence.reputationAgeDays !== null ||
                        reputationEvidence.avgDealsPerMonth !== null) && (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <h3 className="text-sm font-semibold text-white">
                            {t("publicProfile.reputationDetails.sections.trackRecord")}
                          </h3>
                          <div className="mt-2 space-y-2">
                            {reputationEvidence.avgDealsPerMonth !== null && (
                              <div className="flex items-baseline gap-2 text-white">
                                <span className="text-2xl font-semibold">
                                  {decimalFormatter.format(
                                    reputationEvidence.avgDealsPerMonth
                                  )}
                                </span>
                                <span className="text-sm text-white/70">
                                  {t("publicProfile.reputationDetails.trackRecord.perMonth")}
                                </span>
                              </div>
                            )}
                            {reputationEvidence.reputationAgeDays !== null && (
                              <p className="text-xs text-white/60">
                                {t("publicProfile.reputationDetails.trackRecord.activeDays", {
                                  count: numberFormatter.format(
                                    reputationEvidence.reputationAgeDays
                                  ),
                                  label: formatPlural(
                                    reputationEvidence.reputationAgeDays,
                                    "days"
                                  ),
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t("publicProfile.sections.publicDeals")}</h2>
              </div>
              {publicDealsEmpty ? (
                <p className="text-sm text-white/60">{t("publicProfile.emptyPublicDeals")}</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {promises.map((promise) => (
                    <div
                      key={`${promise.title}-${promise.created_at}`}
                      className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{promise.title}</p>
                        <p className="text-xs text-white/50">
                          {formatDealMeta(promise, locale, dealMetaLabels)}
                        </p>
                      </div>
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs ${
                          statusTones[promise.status] ?? "bg-white/5 text-white/70"
                        }`}
                      >
                        {statusLabels[promise.status] ?? promise.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { StatusPill, StatusPillTone } from "@/app/components/ui/StatusPill";
import { DreddiLogoMark } from "@/app/components/DreddiLogo";
import { ReputationSection } from "@/app/components/landing/ReputationSection";
import { UseCasesSection } from "@/app/components/landing/UseCasesSection";
import { getAuthState, isMockAuthEnabled } from "@/lib/auth/getAuthState";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { getLandingCopy } from "@/lib/landingCopy";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { formatDealMeta } from "@/lib/formatDealMeta";

type DealRow = {
  id: string;
  title: string;
  status: PromiseStatus;
  meta?: string;
  due_at?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  confirmed_at?: string | null;
  disputed_at?: string | null;
  declined_at?: string | null;
};

type DemoDealSource = {
  id: string;
  titleKey: string;
  status: PromiseStatus;
  due_at?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  confirmed_at?: string | null;
  disputed_at?: string | null;
  declined_at?: string | null;
};

type ReputationResponse = {
  reputation: {
    user_id: string;
    score: number;
    confirmed_count: number;
    confirmed_with_deadline_count: number;
    disputed_count: number;
    on_time_count: number;
    total_promises_completed: number;
    updated_at: string;
  };
  recent_events: {
    id: string;
    kind: string;
    delta: number;
    created_at: string;
    meta: Record<string, unknown>;
    promise?: { title?: string | null } | null;
  }[];
};

type DealRowProps = {
  item: DealRow;
  href?: string;
  isClickable?: boolean;
  metaText: string;
  statusLabels: Record<PromiseStatus, string>;
};

const BETA_BANNER_DISMISSED_KEY = "dreddi_banner_beta_v1_dismissed";

function DealRow({
  item,
  href,
  isClickable = true,
  metaText,
  statusLabels,
}: DealRowProps) {
  const baseClass = "flex items-start justify-between gap-3 py-2.5 text-slate-200";
  const interactiveClass = isClickable ? "transition hover:text-white" : "cursor-default";
  const titleClass = "truncate text-sm font-medium text-slate-100";
  const metaClass = "mt-1 truncate text-xs text-slate-400";
  const statusPillToneMap: Record<PromiseStatus, StatusPillTone> = {
    active: "neutral",
    completed_by_promisor: "attention",
    confirmed: "success",
    disputed: "danger",
    declined: "danger",
  };

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className={titleClass}>{item.title}</div>
        {metaText ? <div className={metaClass}>{metaText}</div> : null}
      </div>
      <StatusPill
        label={statusLabels[item.status] ?? item.status}
        tone={statusPillToneMap[item.status] ?? "neutral"}
        marker="none"
        className="shrink-0 px-2 py-1 text-xs"
      />
    </>
  );

  if (!isClickable || !href) {
    return <div className={`${baseClass} ${interactiveClass}`}>{content}</div>;
  }

  return (
    <Link href={href} className={`${baseClass} ${interactiveClass}`}>
      {content}
    </Link>
  );
}

function MetricValue({
  isLoading,
  value,
  className,
}: {
  isLoading: boolean;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={className}>
      {isLoading ? (
        <span
          className="block h-8 w-20 animate-pulse rounded-lg bg-white/15"
          aria-hidden="true"
        />
      ) : (
        value
      )}
    </div>
  );
}

export default function Home() {
  const locale = useLocale();
  const t = useT();
  const copy = useMemo(() => getLandingCopy(locale), [locale]);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isBannerStateReady, setIsBannerStateReady] = useState(false);
  const [recentDeals, setRecentDeals] = useState<DealRow[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [reputation, setReputation] = useState<ReputationResponse | null>(null);
  const [reputationLoading, setReputationLoading] = useState(false);
  const [reputationError, setReputationError] = useState<string | null>(null);
  const mockMode = isMockAuthEnabled();
  const isAuthenticated = Boolean(email);
  const isBeta = process.env.NEXT_PUBLIC_BETA !== "false";
  const demoDealsSource: DemoDealSource[] = useMemo(
    () => [
      {
        id: "demo-1",
        titleKey: "landing.demoDeals.deal1.title",
        status: "confirmed" as const,
        confirmed_at: "2024-01-23T19:54:00",
      },
      {
        id: "demo-2",
        titleKey: "landing.demoDeals.deal2.title",
        status: "confirmed" as const,
        confirmed_at: "2024-01-19T11:20:00",
      },
      {
        id: "demo-3",
        titleKey: "landing.demoDeals.deal3.title",
        status: "active" as const,
        due_at: "2024-02-02T18:00:00",
      },
    ],
    []
  );
  const demoDeals: DealRow[] = useMemo(
    () =>
      demoDealsSource.map((deal) => {
        return {
          id: deal.id,
          title: t(deal.titleKey),
          status: deal.status,
          due_at: deal.due_at ?? null,
          created_at: deal.created_at ?? null,
          completed_at: deal.completed_at ?? null,
          confirmed_at: deal.confirmed_at ?? null,
          disputed_at: deal.disputed_at ?? null,
          declined_at: deal.declined_at ?? null,
        };
      }),
    [demoDealsSource, t]
  );

  const statusLabels: Record<PromiseStatus, string> = {
    active: copy.recentDeals.status.active,
    completed_by_promisor: copy.recentDeals.status.completedByPromisor,
    confirmed: copy.recentDeals.status.confirmed,
    disputed: copy.recentDeals.status.disputed,
    declined: copy.recentDeals.status.declined,
  };


  const getMetaText = (item: DealRow) => {
    if (item.meta) {
      return item.meta;
    }
    return formatDealMeta(item, locale, {
      created: (date) => t("deal.meta.created", { date }),
      due: (date) => t("deal.meta.due", { date }),
      closed: (date) => t("deal.meta.closed", { date }),
    });
  };

  useEffect(() => {
    if (!isBeta) {
      setIsBannerDismissed(true);
      setIsBannerStateReady(true);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    try {
      setIsBannerDismissed(window.localStorage.getItem(BETA_BANNER_DISMISSED_KEY) === "1");
    } catch {
      setIsBannerDismissed(false);
    } finally {
      setIsBannerStateReady(true);
    }
  }, [isBeta]);

  const dismissBetaBanner = () => {
    setIsBannerDismissed(true);
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(BETA_BANNER_DISMISSED_KEY, "1");
    } catch {
      // Ignore storage write errors (private mode, blocked storage, etc.).
    }
  };

  useEffect(() => {
    let active = true;
    const client = supabase;

    const syncSession = async () => {
      const authState = await getAuthState();
      if (!active) return;
      setEmail(authState.user?.email ?? null);
      setReady(true);
    };

    void syncSession();

    if (mockMode || !client) {
      return () => {
        active = false;
      };
    }

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user?.email ?? null);
      setReady(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [mockMode]);

  useEffect(() => {
    let cancelled = false;
    const client = supabase;

    const loadRecentDeals = async () => {
      if (mockMode) {
        setRecentDeals(demoDeals);
        setRecentError(null);
        setRecentLoading(false);
        return;
      }

      if (!client) {
        setRecentDeals([]);
        setRecentError(null);
        setRecentLoading(false);
        return;
      }

      if (!email) {
        setRecentDeals([]);
        setRecentError(null);
        setRecentLoading(false);
        return;
      }

      setRecentLoading(true);
      setRecentError(null);

      const { data: userData, error: userErr } = await client.auth.getUser();
      const userId = userData.user?.id;

      if (userErr || !userId) {
        if (!cancelled) {
          setRecentError(userErr?.message ?? copy.errors.userSession);
          setRecentLoading(false);
        }
        return;
      }

      const { data, error } = await client
        .from("promises")
        .select("id,title,status,due_at,created_at,completed_at,confirmed_at,disputed_at,declined_at")
        .or(`creator_id.eq.${userId},counterparty_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(3);

      if (cancelled) return;

      if (error) {
        setRecentError(error.message);
      } else {
        const normalized: DealRow[] = (data ?? []).flatMap((row) => {
          if (!isPromiseStatus(row.status)) return [];
          return [
            {
              id: row.id,
              title: row.title,
              status: row.status as PromiseStatus,
              due_at: row.due_at,
              created_at: row.created_at,
              completed_at: row.completed_at,
              confirmed_at: row.confirmed_at,
              disputed_at: row.disputed_at,
              declined_at: row.declined_at,
            },
          ];
        });

        setRecentDeals(normalized);
      }

      setRecentLoading(false);
    };

    void loadRecentDeals();

    return () => {
      cancelled = true;
    };
  }, [email, mockMode, demoDeals]);

  useEffect(() => {
    let cancelled = false;
    const client = supabase;

    const loadReputation = async () => {
      if (mockMode) {
        setReputation(null);
        setReputationError(null);
        setReputationLoading(false);
        return;
      }

      if (!client) {
        setReputation(null);
        setReputationError(null);
        setReputationLoading(false);
        return;
      }

      if (!email) {
        setReputation(null);
        setReputationError(null);
        setReputationLoading(false);
        return;
      }

      setReputationLoading(true);
      setReputationError(null);

      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      const token = sessionData.session?.access_token;

      if (sessionError || !token) {
        if (!cancelled) {
          setReputationError(sessionError?.message ?? copy.errors.notAuthenticated);
          setReputationLoading(false);
        }
        return;
      }

      const res = await fetch("/api/reputation/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (cancelled) return;

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setReputationError(body.error ?? copy.errors.reputation);
      } else {
        const body = (await res.json()) as ReputationResponse;
        setReputation(body);
        if (process.env.NODE_ENV !== "production") {
          console.info("dashboard on-time metrics", {
            confirmed: body.reputation.confirmed_count,
            disputed: body.reputation.disputed_count,
            confirmedWithDeadline: body.reputation.confirmed_with_deadline_count,
            onTime: body.reputation.on_time_count,
            totalCompleted: body.reputation.total_promises_completed,
          });
        }
      }

      setReputationLoading(false);
    };

    void loadReputation();

    return () => {
      cancelled = true;
    };
  }, [email, mockMode]);

  const rep = reputation?.reputation;
  const score = rep?.score ?? 50;
  const confirmedCount = rep?.confirmed_count ?? 0;
  const confirmedWithDeadlineCount = rep?.confirmed_with_deadline_count ?? 0;
  const disputedCount = rep?.disputed_count ?? 0;
  const onTimeCount = rep?.on_time_count ?? 0;
  const onTimePercentage =
    confirmedWithDeadlineCount > 0
      ? Math.round((onTimeCount / confirmedWithDeadlineCount) * 100)
      : null;
  const onTimeSummary = onTimePercentage === null ? null : `${onTimePercentage}%`;
  const hasDueDateDeals = confirmedWithDeadlineCount > 0;
  const onTimeLineValue = hasDueDateDeals
    ? reputationLoading
      ? copy.loading.placeholder
      : onTimeSummary
    : "—";
  const recentDealsHref = isAuthenticated ? "/promises" : "/login";
  const recentDealsLimited = recentDeals.slice(0, 3);
  const recentDealsTitle = copy.recentDeals.title;
  const showBetaBanner = isBeta && ready && isAuthenticated && isBannerStateReady && !isBannerDismissed;

  const renderMultiline = (text: string) =>
    text.split("\n").map((line, index, lines) => (
      <span key={`${line}-${index}`}>
        {line}
        {index < lines.length - 1 ? <br /> : null}
      </span>
    ));

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(82,193,106,0.22),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_55%_65%,rgba(34,55,93,0.18),transparent_40%)]" />

      {showBetaBanner ? (
        <div className="relative mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
          <div className="rounded-2xl border border-amber-300/25 bg-gradient-to-r from-amber-500/15 via-slate-900/20 to-rose-500/10 px-4 py-2 text-sm text-slate-50 shadow-[0_8px_24px_rgba(5,15,20,0.35)] backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.5)]" aria-hidden />
              <p className="flex-1 text-sm text-slate-100/80">
                {t("landing.betaBanner.body")}
              </p>
              <button
                type="button"
                onClick={dismissBetaBanner}
                aria-label={t("landing.betaBanner.dismiss")}
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 text-slate-200/80 transition-colors duration-150 hover:bg-white/5 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-4 pb-12 pt-20 sm:px-6 md:gap-16 md:flex-row md:items-center md:py-14">
        <div className="flex-1 flex flex-col gap-5 md:gap-7">
          <div className="order-1 space-y-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <DreddiLogoMark className="h-12 w-12 drop-shadow-[0_0_25px_rgba(52,211,153,0.35)] sm:h-14 sm:w-14" />
              <div className="relative inline-flex items-baseline gap-2.5 pr-1 text-[2rem] leading-none tracking-[-0.02em] sm:text-5xl">
                <span className="bg-gradient-to-r from-emerald-200 via-emerald-300 to-sky-200 bg-clip-text font-semibold text-transparent [text-shadow:0_0_22px_rgba(52,211,153,0.18)]">
                  Dreddi
                </span>
                <span className="font-medium text-white/92 [text-shadow:0_0_18px_rgba(148,163,184,0.22)]">
                  {t("landing.hero.brandSuffix")}
                </span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-2 left-0 h-px w-full bg-gradient-to-r from-emerald-300/0 via-emerald-300/55 to-sky-300/0"
                />
              </div>
            </div>
            <p className="max-w-xl text-xl font-semibold text-white">
              {copy.hero.headline}
            </p>
            <p className="max-w-xl text-lg text-slate-300">
              {renderMultiline(copy.hero.description)}
            </p>
          </div>

          {!ready ? (
            <div className="order-3 flex items-center gap-3 text-slate-400 md:order-4">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              {copy.loading.session}
            </div>
          ) : !isAuthenticated ? (
            <div className="order-3 flex flex-wrap items-center gap-3 md:order-4">
              <Link
                href="/login"
                className="rounded-xl bg-emerald-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
              >
                {copy.cta.getStarted}
              </Link>
              <Link
                href="/promises"
                className="rounded-xl border border-white/15 px-6 py-3 text-base font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
              >
                {copy.cta.reviewDeals}
              </Link>
            </div>
          ) : (
            <div className="order-3 flex flex-wrap items-center gap-3 md:order-4">
              <Link
                href="/promises/new"
                className="rounded-xl bg-emerald-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
              >
                {copy.cta.createPromise}
              </Link>
              <Link
                href="/promises"
                className="rounded-xl border border-white/15 px-6 py-3 text-base font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
              >
                {copy.cta.reviewDeals}
              </Link>
            </div>
          )}

        </div>

        <div className="flex-1">
          <div className="glass-panel relative overflow-hidden rounded-3xl border-white/10 px-7 pb-7 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-slate-900/5 to-white/[0.02]" aria-hidden />
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{
                background:
                  "linear-gradient(160deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03) 35%, rgba(255,255,255,0) 60%)",
              }}
              aria-hidden
            />
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <DreddiLogoMark className="h-10 w-10" />
                {email ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 ring-1 ring-white/10">
                    <span className="status-pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
                    {copy.score.live}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 ring-1 ring-white/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400/70" />
                    {copy.score.signIn}
                  </span>
                )}
              </div>

              <div>
                <p className="mb-1.5 text-xs uppercase tracking-[0.1em] text-slate-400/90">
                  {copy.score.overviewLabel}
                </p>
                <div className="score-metrics-panel mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition-[background,box-shadow,border-color] duration-300 ease-out hover:border-white/15 hover:bg-white/[0.05] hover:shadow-[0_16px_30px_rgba(15,23,42,0.45)] sm:px-5 sm:py-3 md:px-4 md:py-3">
                  <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
                    <div className="py-2 sm:px-4 sm:py-1">
                      <div className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{copy.score.shortLabel}</div>
                      <MetricValue
                        isLoading={reputationLoading}
                        value={score}
                        className="mt-1 text-3xl font-semibold leading-none text-white sm:text-[2.05rem]"
                      />
                    </div>

                    <div className="py-2 sm:px-4 sm:py-1">
                      <div className="text-[11px] uppercase tracking-[0.08em] text-slate-400">
                        {copy.score.cards.confirmed}
                      </div>
                      <MetricValue
                        isLoading={reputationLoading}
                        value={confirmedCount}
                        className="mt-1 text-3xl font-semibold leading-none text-white"
                      />
                    </div>

                    <div className="py-2 sm:px-4 sm:py-1">
                      <div className="text-[11px] uppercase tracking-[0.08em] text-slate-400">
                        {copy.score.cards.disputed}
                      </div>
                      <MetricValue
                        isLoading={reputationLoading}
                        value={disputedCount}
                        className="mt-1 text-3xl font-semibold leading-none text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-400">
                {copy.score.onTime.label}: {onTimeLineValue}
              </p>

                {reputationError && isAuthenticated && (
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                    {reputationError}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>{recentDealsTitle}</span>
                    <Link
                      href={recentDealsHref}
                      className="text-xs font-medium text-slate-400 transition hover:text-slate-200"
                    >
                      {copy.recentDeals.seeAll}
                    </Link>
                  </div>
                  {!isAuthenticated ? (
                    <div className="mt-3">
                      <div className="mt-1 divide-y divide-white/10 text-sm">
                        {demoDeals.map((item) => (
                          <DealRow
                            key={item.id}
                            item={item}
                            isClickable={false}
                            metaText={getMetaText(item)}
                            statusLabels={statusLabels}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {recentError && (
                        <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                          {recentError}
                        </div>
                      )}

                      <div className="mt-1 text-sm">
                        {reputationLoading || recentLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="h-[52px] animate-pulse rounded-xl bg-white/5" />
                            ))}
                          </div>
                        ) : recentDeals.length === 0 ? (
                          <div className="rounded-xl bg-white/[0.03] px-3 py-3 text-xs text-slate-400">
                            {copy.recentDeals.empty}
                          </div>
                        ) : (
                          <div className="divide-y divide-white/10">
                            {recentDealsLimited.map((item) => (
                              <DealRow
                                key={item.id}
                                item={item}
                                href={`/promises/${item.id}?from=dashboard`}
                                metaText={getMetaText(item)}
                                statusLabels={statusLabels}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>

      <UseCasesSection copy={copy.useDreddi} />
      <ReputationSection copy={copy.reputation} scoreCopy={copy.score} />
    </main>
  );
}

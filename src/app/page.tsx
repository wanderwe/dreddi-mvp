"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DreddiLogoMark } from "@/app/components/DreddiLogo";
import { UseCasesSection } from "@/app/components/landing/UseCasesSection";
import { getAuthState, isMockAuthEnabled } from "@/lib/auth/getAuthState";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { getLandingCopy } from "@/lib/landingCopy";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { formatDueDate } from "@/lib/formatDueDate";

type DealRow = {
  id: string;
  title: string;
  status: PromiseStatus;
  due_at?: string | null;
  created_at?: string;
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
  href: string;
  metaText: string;
  statusLabels: Record<PromiseStatus, string>;
  statusTones: Record<PromiseStatus, string>;
};

function DealRow({ item, href, metaText, statusLabels, statusTones }: DealRowProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 px-3 py-2 text-slate-200 transition hover:border-emerald-300/40 hover:bg-emerald-500/10"
    >
      <div>
        <div className="font-semibold text-white">{item.title}</div>
        {metaText ? <div className="text-xs text-slate-400">{metaText}</div> : null}
      </div>
      <span
        className={`rounded-full px-3 py-1 text-xs ${statusTones[item.status] ?? "bg-white/5 text-white"}`}
      >
        {statusLabels[item.status] ?? item.status}
      </span>
    </Link>
  );
}

export default function Home() {
  const locale = useLocale();
  const t = useT();
  const copy = useMemo(() => getLandingCopy(locale), [locale]);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [recentDeals, setRecentDeals] = useState<DealRow[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [reputation, setReputation] = useState<ReputationResponse | null>(null);
  const [reputationLoading, setReputationLoading] = useState(false);
  const [reputationError, setReputationError] = useState<string | null>(null);
  const mockMode = isMockAuthEnabled();
  const isAuthenticated = Boolean(email);
  const { nextSaturday, nextMarchFirst } = useMemo(() => {
    const now = new Date();
    const upcomingSaturday = new Date(now);
    const daysUntilSaturday = (6 - upcomingSaturday.getDay() + 7) % 7;
    upcomingSaturday.setDate(upcomingSaturday.getDate() + daysUntilSaturday);
    upcomingSaturday.setHours(0, 0, 0, 0);
    const upcomingMarchFirst = new Date(now.getFullYear() + 1, 2, 1);
    upcomingMarchFirst.setHours(0, 0, 0, 0);
    return { nextSaturday: upcomingSaturday, nextMarchFirst: upcomingMarchFirst };
  }, []);

  const defaultDueHour = 18;
  const defaultDueMinute = 0;

  const toIsoDateTime = (date: Date) => {
    const localDate = new Date(date);
    localDate.setHours(defaultDueHour, defaultDueMinute, 0, 0);
    return localDate.toISOString();
  };

  const demoDeals: DealRow[] = useMemo(
    () =>
      copy.demoDeals.map((deal) => {
        const due_at =
          deal.dueDate === "nextSaturday"
            ? toIsoDateTime(nextSaturday)
            : deal.dueDate === "nextMarchFirst"
            ? toIsoDateTime(nextMarchFirst)
            : null;

        return {
          id: deal.id,
          title: deal.title,
          status: deal.status,
          due_at,
          created_at: new Date().toISOString(),
        };
      }),
    [copy, nextSaturday, nextMarchFirst]
  );

  const statusLabels: Record<PromiseStatus, string> = {
    active: copy.recentDeals.status.active,
    completed_by_promisor: copy.recentDeals.status.completedByPromisor,
    confirmed: copy.recentDeals.status.confirmed,
    disputed: copy.recentDeals.status.disputed,
  };

  const statusTones: Record<PromiseStatus, string> = {
    active: "bg-white/5 text-emerald-200 border border-white/10",
    completed_by_promisor: "bg-amber-500/10 text-amber-100 border border-amber-300/40",
    confirmed: "bg-emerald-500/10 text-emerald-100 border border-emerald-300/40",
    disputed: "bg-red-500/10 text-red-100 border border-red-300/40",
  };

  const formatDateTimeShort = (value: string) => {
    try {
      const date = new Date(value);
      const dateText = new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }).format(date);
      const timeText = new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
      return `${dateText}, ${timeText}`;
    } catch {
      return value;
    }
  };

  const getMetaText = (item: DealRow) => {
    if (item.due_at) {
      const formatted = formatDueDate(item.due_at, locale, { includeYear: false, includeTime: true });
      if (formatted) {
        return copy.recentDeals.placeholderMetaDue(formatted);
      }
    }

    if (item.created_at) {
      return copy.recentDeals.placeholderMetaCreated(formatDateTimeShort(item.created_at));
    }

    return "";
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
        .select("id,title,status,due_at,created_at")
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
  const onTimeHelper =
    confirmedWithDeadlineCount === 0 ? copy.score.onTime.empty : copy.score.onTime.helper;
  const hasDueDateDeals = confirmedWithDeadlineCount > 0;
  const recentDealsLimited = recentDeals.slice(0, 3);

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

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-4 pb-12 pt-24 sm:px-6 md:gap-16 md:flex-row md:items-center md:py-14">
        <div className="flex-1 flex flex-col gap-6 md:gap-8">
          <div className="order-1 space-y-5 sm:space-y-4">
            {/*
              <div className="inline-flex w-fit max-w-[90vw] items-center gap-2 whitespace-normal rounded-full border border-emerald-400/10 bg-emerald-500/5 px-3 py-1 text-[11px] font-medium leading-relaxed tracking-wide text-emerald-200/80 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)] backdrop-blur sm:max-w-full sm:gap-2.5 sm:whitespace-nowrap sm:px-3.5 sm:py-1.5 sm:text-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-300/70 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                {copy.hero.eyebrow}
              </div>
            */}
            <div className="flex items-center gap-4">
              <DreddiLogoMark className="h-12 w-12 drop-shadow-[0_0_25px_rgba(52,211,153,0.35)] sm:h-14 sm:w-14" />
              <div className="flex items-center gap-3 text-3xl font-semibold leading-tight sm:text-5xl">
                <span className="rounded-2xl bg-emerald-500/10 px-4 py-2 text-emerald-300">Dreddi</span>
                <span className="text-white">{t("landing.hero.brandSuffix")}</span>
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
                href="/u"
                className="rounded-xl border border-white/15 px-6 py-3 text-base font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
              >
                {copy.cta.publicProfiles}
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
          <div className="glass-panel relative overflow-hidden rounded-3xl border-white/10 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-white/10 to-sky-400/5" aria-hidden />
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DreddiLogoMark className="h-12 w-12 drop-shadow-[0_10px_30px_rgba(16,185,129,0.35)]" />
                  <div>
                    <p className="text-sm text-slate-300">{copy.score.label}</p>
                    <p className="text-2xl font-semibold text-white">
                      {reputationLoading ? copy.loading.short : score}
                    </p>
                  </div>
                </div>
                {email ? (
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-emerald-200 ring-1 ring-white/10">
                    {copy.score.live}
                  </span>
                ) : (
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">
                    {copy.score.signIn}
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 shadow-inner shadow-black/30">
                  <div className="text-xs text-emerald-200">{copy.score.cards.confirmed}</div>
                  <div className="text-lg font-semibold">
                    {reputationLoading ? copy.loading.placeholder : confirmedCount}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50 shadow-inner shadow-black/30">
                  <div className="text-xs text-amber-200">{copy.score.cards.disputed}</div>
                  <div className="text-lg font-semibold">
                    {reputationLoading ? copy.loading.placeholder : disputedCount}
                  </div>
                </div>
              </div>

                {reputationError && isAuthenticated && (
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                    {reputationError}
                  </div>
                )}

              <div className="rounded-2xl border border-white/10 bg-black/30 p-3 shadow-inner shadow-black/50">
                <div className="flex items-center gap-3 text-sm text-emerald-200">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span>{copy.score.onTime.label}</span>
                  {hasDueDateDeals ? (
                    <span className="ml-auto text-lg font-semibold text-white">
                      {reputationLoading ? copy.loading.placeholder : onTimeSummary}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-emerald-100/80">
                  {onTimeHelper}
                </p>
              </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>{copy.recentDeals.title}</span>
                    <Link
                      href={isAuthenticated ? "/promises" : "/login?next=%2Fpromises"}
                      className="text-xs font-medium text-emerald-200 hover:text-emerald-100"
                    >
                      {copy.recentDeals.seeAll}
                    </Link>
                  </div>
                  {!isAuthenticated ? (
                    <div className="mt-3">
                      <p className="text-xs text-slate-400">{copy.recentDeals.guestHint}</p>
                      <div className="mt-3 space-y-2 text-sm">
                        {demoDeals.map((item) => (
                          <DealRow
                            key={item.id}
                            item={item}
                            href="/login?next=%2Fpromises"
                            metaText={getMetaText(item)}
                            statusLabels={statusLabels}
                            statusTones={statusTones}
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

                      <div className="mt-3 space-y-2 text-sm">
                        {reputationLoading || recentLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="h-[64px] animate-pulse rounded-xl bg-white/5" />
                            ))}
                          </div>
                        ) : recentDeals.length === 0 ? (
                          <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-3 text-xs text-slate-400">
                            {copy.recentDeals.empty}
                          </div>
                        ) : (
                          recentDealsLimited.map((item) => (
                            <DealRow
                              key={item.id}
                              item={item}
                              href={`/promises/${item.id}`}
                              metaText={getMetaText(item)}
                              statusLabels={statusLabels}
                              statusTones={statusTones}
                            />
                          ))
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
    </main>
  );
}

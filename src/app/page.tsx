"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DreddiLogo, DreddiLogoMark } from "@/app/components/DreddiLogo";
import { HeaderActions } from "@/app/components/HeaderActions";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { supabase } from "@/lib/supabaseClient";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";

type DealRow = {
  id: string;
  title: string;
  status: PromiseStatus;
  meta?: string;
  due_at?: string | null;
  created_at?: string;
};

type ReputationResponse = {
  reputation: {
    user_id: string;
    score: number;
    confirmed_count: number;
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

export default function Home() {
  const t = useT();
  const locale = useLocale();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [recentDeals, setRecentDeals] = useState<DealRow[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [reputation, setReputation] = useState<ReputationResponse | null>(null);
  const [reputationLoading, setReputationLoading] = useState(false);
  const [reputationError, setReputationError] = useState<string | null>(null);

  const highlights = [
    {
      key: "promisesTracked",
      text: t("home.highlights.promisesTracked"),
    },
    {
      key: "reputationIntact",
      text: t("home.highlights.reputationIntact"),
    },
    {
      key: "dreddiKnows",
      text: t("home.highlights.dreddiKnows"),
    },
  ];

  const showcasePromises: DealRow[] = [
    {
      id: "demo-1",
      title: t("home.showcase.0.title"),
      meta: t("home.showcase.0.meta"),
      status: "active",
    },
    {
      id: "demo-2",
      title: t("home.showcase.1.title"),
      meta: t("home.showcase.1.meta"),
      status: "active",
    },
    {
      id: "demo-3",
      title: t("home.showcase.2.title"),
      meta: t("home.showcase.2.meta"),
      status: "confirmed",
    },
  ];

  const statusLabels: Record<PromiseStatus, string> = {
    active: t("home.recentDeals.status.active"),
    completed_by_promisor: t("home.recentDeals.status.completed_by_promisor"),
    confirmed: t("home.recentDeals.status.confirmed"),
    disputed: t("home.recentDeals.status.disputed"),
  };

  const statusTones: Record<PromiseStatus, string> = {
    active: "bg-white/5 text-emerald-200 border border-white/10",
    completed_by_promisor: "bg-amber-500/10 text-amber-100 border border-amber-300/40",
    confirmed: "bg-emerald-500/10 text-emerald-100 border border-emerald-300/40",
    disputed: "bg-red-500/10 text-red-100 border border-red-300/40",
  };

  const formatDateShort = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setEmail(data.session?.user?.email ?? null);
      setReady(true);
    };

    void syncSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user?.email ?? null);
      setReady(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRecentDeals = async () => {
      if (!email) {
        setRecentDeals([]);
        setRecentError(null);
        setRecentLoading(false);
        return;
      }

      setRecentLoading(true);
      setRecentError(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (userErr || !userId) {
        if (!cancelled) {
          setRecentError(userErr?.message ?? t("home.errors.userSession"));
          setRecentLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
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
  }, [email]);

  useEffect(() => {
    let cancelled = false;

    const loadReputation = async () => {
      if (!email) {
        setReputation(null);
        setReputationError(null);
        setReputationLoading(false);
        return;
      }

      setReputationLoading(true);
      setReputationError(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (sessionError || !token) {
        if (!cancelled) {
          setReputationError(sessionError?.message ?? t("home.errors.notAuthenticated"));
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
        setReputationError(body.error ?? t("home.errors.reputation"));
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
  }, [email]);

  async function logout() {
    await supabase.auth.signOut();
    // onAuthStateChange оновить UI
  }

  const rep = reputation?.reputation;
  const score = rep?.score ?? 50;
  const confirmedCount = rep?.confirmed_count ?? 0;
  const disputedCount = rep?.disputed_count ?? 0;
  const onTimeCount = rep?.on_time_count ?? 0;
  const recentEvents = reputation?.recent_events ?? [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(82,193,106,0.22),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_55%_65%,rgba(34,55,93,0.18),transparent_40%)]" />

      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <Link href="/" className="flex items-center text-white">
            <DreddiLogo
              accentClassName="text-xs"
              markClassName="h-10 w-10"
              titleClassName="text-lg"
            />
          </Link>
          <HeaderActions showLogout={Boolean(email)} onLogout={logout} />
        </div>
      </header>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-16 px-6 py-14 md:flex-row md:items-center">
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(74,222,128,0.25)]" />
            {t("home.eyebrow")}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <DreddiLogoMark className="h-14 w-14 drop-shadow-[0_0_25px_rgba(52,211,153,0.35)]" />
              <div className="flex items-center gap-3 text-4xl font-semibold leading-tight sm:text-5xl">
                <span className="rounded-2xl bg-emerald-500/10 px-4 py-2 text-emerald-300">Dreddi</span>
                <span className="text-white">knows</span>
              </div>
            </div>
            <p className="max-w-xl text-lg text-slate-300">
              {t("home.tagline")}
            </p>
            <div className="grid max-w-lg gap-2 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-200 ring-1 ring-white/10"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                    ✓
                  </span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          {!ready ? (
            <div className="flex items-center gap-3 text-slate-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              {t("home.loading")}
            </div>
          ) : !email ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-emerald-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
              >
                {t("home.cta.getStarted")}
              </Link>
              <Link
                href="/p"
                className="rounded-xl border border-white/15 px-6 py-3 text-base font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
              >
                {t("home.cta.publicProfiles")}
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/promises/new"
                className="rounded-xl bg-emerald-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
              >
                {t("home.cta.createPromise")}
              </Link>
              <Link
                href="/promises"
                className="rounded-xl border border-white/15 px-6 py-3 text-base font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
              >
                {t("home.cta.reviewDeals")}
              </Link>
              <button
                onClick={logout}
                className="rounded-xl px-6 py-3 text-base font-medium text-slate-300 transition hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
                type="button"
              >
                {t("home.cta.logout")}
              </button>
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
                    <p className="text-sm text-slate-300">{t("home.score.label")}</p>
                    <p className="text-2xl font-semibold text-white">
                      {reputationLoading ? t("home.loadingShort") : score}
                    </p>
                  </div>
                </div>
                {email ? (
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-emerald-200 ring-1 ring-white/10">
                    {t("home.score.live")}
                  </span>
                ) : (
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">
                    {t("home.score.signIn")}
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200 shadow-inner shadow-black/30">
                  <div className="text-xs text-slate-400">{t("home.score.cards.score")}</div>
                  <div className="text-2xl font-semibold text-white">
                    {reputationLoading ? t("home.loadingPlaceholder") : score}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 shadow-inner shadow-black/30">
                  <div className="text-xs text-emerald-200">{t("home.score.cards.confirmed")}</div>
                  <div className="text-lg font-semibold">
                    {reputationLoading
                      ? t("home.loadingPlaceholder")
                      : t("home.score.cards.confirmedSuffix", {
                          count: confirmedCount,
                        })}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50 shadow-inner shadow-black/30">
                  <div className="text-xs text-amber-200">{t("home.score.cards.disputed")}</div>
                  <div className="text-lg font-semibold">
                    {reputationLoading
                      ? t("home.loadingPlaceholder")
                      : t("home.score.cards.disputedSuffix", {
                          count: disputedCount,
                        })}
                  </div>
                </div>
              </div>

              {reputationError && email && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                  {reputationError}
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-inner shadow-black/50">
                <div className="flex items-center gap-2 text-sm text-emerald-200">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  {t("home.score.onTime.label")}
                </div>
                <p className="mt-2 text-lg font-semibold text-white">
                  {reputationLoading
                    ? t("home.loadingPlaceholder")
                    : t("home.score.onTime.suffix", {
                        count: onTimeCount,
                      })}
                </p>
                <p className="text-sm text-slate-300">
                  {email
                    ? t("home.score.onTime.descriptionSignedIn")
                    : t("home.score.onTime.descriptionGuest")}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>{t("home.recentDeals.title")}</span>
                  <Link
                    href="/promises"
                    className="text-xs font-medium text-emerald-200 hover:text-emerald-100"
                  >
                    {t("home.recentDeals.seeAll")}
                  </Link>
                </div>
                {recentError && email && (
                  <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {recentError}
                  </div>
                )}

                {!email && (
                  <p className="mt-3 text-xs text-slate-400">
                    {t("home.recentDeals.guestHint")}
                  </p>
                )}

                <div className="mt-3 space-y-2 text-sm">
                  {reputationLoading || recentLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-[64px] animate-pulse rounded-xl bg-white/5" />
                      ))}
                    </div>
                  ) : email && recentEvents.length > 0 ? (
                    recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 px-3 py-2 text-slate-200"
                      >
                        <div>
                          <div className="font-semibold text-white">
                            {event.delta > 0 ? `+${event.delta}` : event.delta} {event.kind.replace("promise_", "").replace("_", " ")}
                          </div>
                          <div className="text-xs text-slate-400">
                            {event.promise?.title ?? t("home.recentDeals.eventFallbackTitle")}
                            {" • "}
                            {new Date(event.created_at).toLocaleString(locale)}
                          </div>
                        </div>
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs",
                            event.delta >= 0
                              ? "bg-emerald-500/15 text-emerald-100 border border-emerald-400/30"
                              : "bg-red-500/10 text-red-100 border border-red-400/30",
                          ].join(" ")}
                        >
                          {event.delta >= 0
                            ? t("home.recentDeals.sentiment.positive")
                            : t("home.recentDeals.sentiment.negative")}
                        </span>
                      </div>
                    ))
                  ) : email && recentDeals.length === 0 ? (
                    <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-3 text-xs text-slate-400">
                      {t("home.recentDeals.empty")}
                    </div>
                  ) : (
                    (email ? recentDeals : showcasePromises).map((item) => {
                      const metaText =
                        item.meta ??
                        (item.due_at
                          ? t("home.recentDeals.placeholderMetaDue", {
                              date: formatDateShort(item.due_at),
                            })
                          : item.created_at
                          ? t("home.recentDeals.placeholderMetaCreated", {
                              date: formatDateShort(item.created_at),
                            })
                          : "");

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 px-3 py-2 text-slate-200"
                        >
                          <div>
                            <div className="font-semibold text-white">{item.title}</div>
                            <div className="text-xs text-slate-400">{metaText}</div>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs ${statusTones[item.status] ?? "bg-white/5 text-white"}`}
                          >
                            {statusLabels[item.status] ?? item.status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

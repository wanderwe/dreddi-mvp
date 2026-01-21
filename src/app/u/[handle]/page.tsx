"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { getLandingCopy } from "@/lib/landingCopy";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { formatDueDate } from "@/lib/formatDueDate";
import { publicProfileDetailSelect } from "@/lib/publicProfileQueries";

type PublicProfileRow = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  reputation_score: number | null;
  confirmed_count: number | null;
  completed_count: number | null;
  disputed_count: number | null;
  last_activity_at: string | null;
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
  const t = useT();
  const locale = useLocale();
  const landingCopy = getLandingCopy(locale);
  const handle = useMemo(() => {
    const raw = params?.handle;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [profile, setProfile] = useState<PublicProfileRow | null>(null);
  const [promises, setPromises] = useState<PublicPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

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

  const displayName = profile?.display_name?.trim() || profile?.handle || "";
  const hasHistory = [profile?.confirmed_count, profile?.disputed_count].some(
    (value) => value !== null && value !== undefined
  );
  const confirmedCount = profile?.confirmed_count ?? 0;
  const disputedCount = profile?.disputed_count ?? 0;
  const reputationScore = profile?.reputation_score ?? 50;
  const reputationSummary = hasHistory
    ? [
        t("publicProfile.summary.confirmed", { count: confirmedCount }),
        t("publicProfile.summary.disputed", { count: disputedCount }),
      ].join(" · ")
    : t("publicProfile.emptyHistory");
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
  const lastActivityRelative = lastActivityAt ? formatRelativeTime(lastActivityAt) : null;
  const lastActivityLabel = lastActivityAt
    ? t("publicProfile.summary.lastActivity", { time: lastActivityRelative ?? "—" })
    : t("publicProfile.summary.lastActivityEmpty");

  return (
    <main className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
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
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/10">
                    {profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-semibold text-white/80">
                        {displayName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold">{displayName}</h1>
                    <p className="text-sm text-white/60">@{profile?.handle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-100 sm:w-auto"
                >
                  {copied ? t("profileSettings.copySuccess") : t("profileSettings.copyLink")}
                </button>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wide text-white/50">
                  {t("publicProfile.reputationScore")}
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">{reputationScore}</div>
                <div className="mt-2 text-sm text-white/80">{reputationSummary}</div>
                <div className="mt-2 text-xs text-white/50">{lastActivityLabel}</div>
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
                          {promise.due_at
                            ? t("publicProfile.meta.due", {
                                date:
                                  formatDueDate(promise.due_at, locale, {
                                    includeYear: false,
                                    includeTime: true,
                                  }) ??
                                  promise.due_at,
                              })
                            : t("publicProfile.meta.noDue")}
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

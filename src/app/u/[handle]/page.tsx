"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";

type PublicProfileRow = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  reputation_score: number | null;
  confirmed_count: number | null;
  disputed_count: number | null;
  last_activity_at: string | null;
};

type PublicDealRow = {
  title: string | null;
  status: string | null;
  created_at: string | null;
  due_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
};

type PublicDeal = {
  title: string;
  status: PromiseStatus;
  created_at: string;
  due_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
};

const statusTones: Record<PromiseStatus, string> = {
  active: "bg-white/5 text-emerald-200 border border-white/10",
  completed_by_promisor: "bg-amber-500/10 text-amber-100 border border-amber-300/40",
  confirmed: "bg-emerald-500/10 text-emerald-100 border border-emerald-300/40",
  disputed: "bg-red-500/10 text-red-100 border border-red-300/40",
};

const getRelativeUnit = (diffMs: number) => {
  const minutes = Math.round(diffMs / 60000);
  if (Math.abs(minutes) < 60) return { value: minutes, unit: "minute" as const };
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return { value: hours, unit: "hour" as const };
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return { value: days, unit: "day" as const };
  const weeks = Math.round(days / 7);
  return { value: weeks, unit: "week" as const };
};

export default function PublicProfilePage() {
  const params = useParams();
  const t = useT();
  const locale = useLocale();
  const handle = useMemo(() => {
    const raw = params?.handle;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [profile, setProfile] = useState<PublicProfileRow | null>(null);
  const [deals, setDeals] = useState<PublicDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDateShort = useMemo(
    () =>
      (value: string) =>
        new Intl.DateTimeFormat(locale, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(value)),
    [locale]
  );

  const formatRelative = useMemo(() => {
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    return (value: string) => {
      const diff = Date.now() - new Date(value).getTime();
      const { value: unitValue, unit } = getRelativeUnit(diff);
      if (Math.abs(unitValue) >= 4 && unit === "week") {
        return formatDateShort(value);
      }
      return formatter.format(-unitValue, unit);
    };
  }, [locale, formatDateShort]);

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

      const { data: profileRow, error: profileErr } = await supabase
        .from("public_profile_stats")
        .select(
          "handle,display_name,avatar_url,reputation_score,confirmed_count,disputed_count,last_activity_at"
        )
        .eq("handle", handle)
        .maybeSingle();

      if (!active) return;

      if (profileErr || !profileRow) {
        setError(profileErr?.message ?? t("publicProfile.errors.notFound"));
        setLoading(false);
        return;
      }

      setProfile(profileRow as PublicProfileRow);

      const { data, error: dealsErr } = await supabase.rpc("public_get_profile_deals", {
        p_handle: profileRow.handle,
        p_limit: 5,
      });
      const dealRows = (data ?? []) as PublicDealRow[];

      if (!active) return;

      if (dealsErr) {
        setDeals([]);
      } else {
        const normalized: PublicDeal[] = dealRows.flatMap((row: PublicDealRow) => {
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
        setDeals(normalized);
      }

      setLoading(false);
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [handle, t]);

  const statusLabels: Partial<Record<PromiseStatus, string>> = {
    confirmed: t("home.recentDeals.status.confirmed"),
    disputed: t("home.recentDeals.status.disputed"),
  };

  const displayName = profile?.display_name?.trim() || profile?.handle || "";
  const score = profile?.reputation_score ?? 50;
  const confirmedCount = profile?.confirmed_count ?? 0;
  const disputedCount = profile?.disputed_count ?? 0;
  const lastActivity = profile?.last_activity_at;

  const reputationStatusKey = score >= 70 ? "strong" : score >= 50 ? "steady" : "risk";

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
              <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
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
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-semibold">{displayName}</h1>
                      {confirmedCount > 0 && (
                        <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                          {t("publicProfile.verifiedBadge")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/60">@{profile?.handle}</p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-black/40 px-5 py-4">
                  <span className="text-xs uppercase tracking-wide text-white/50">
                    {t("publicProfile.reputation")}
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-semibold">{score}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                      {t(`publicProfile.status.${reputationStatusKey}`)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="max-w-xl text-sm text-white/50">
                <span className="block">{t("thesis.line1")}</span>
                <span className="block">{t("thesis.line2")}</span>
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-white/60">
                <span>
                  {t("publicProfile.confirmed")} · <span className="text-white">{confirmedCount}</span>
                </span>
                <span>
                  {t("publicProfile.disputed")} · <span className="text-white">{disputedCount}</span>
                </span>
                <span>
                  {t("publicProfile.lastActivity")} ·{" "}
                  <span className="text-white">
                    {lastActivity ? formatRelative(lastActivity) : t("publicProfile.noActivity")}
                  </span>
                </span>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs uppercase tracking-wide text-white/50">{t("publicProfile.confirmed")}</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-200">{confirmedCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs uppercase tracking-wide text-white/50">{t("publicProfile.disputed")}</p>
                <p className="mt-2 text-3xl font-semibold text-red-200">{disputedCount}</p>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t("publicProfile.recentDeals")}</h2>
              </div>
              {deals.length === 0 ? (
                <p className="text-sm text-white/60">{t("publicProfile.emptyDeals")}</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {deals.map((deal) => {
                    const finalizedAt = deal.confirmed_at ?? deal.disputed_at ?? deal.created_at;
                    return (
                      <div
                        key={`${deal.title}-${deal.created_at}`}
                        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{deal.title}</p>
                          <p className="text-xs text-white/50">
                            {t("publicProfile.recentDealsMeta", { date: formatDateShort(finalizedAt) })}
                          </p>
                        </div>
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs ${
                            statusTones[deal.status] ?? "bg-white/5 text-white/70"
                          }`}
                        >
                          {statusLabels[deal.status] ?? deal.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

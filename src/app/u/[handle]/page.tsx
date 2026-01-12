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
  confirmed_count: number | null;
  disputed_count: number | null;
  active_count: number | null;
  pending_acceptance_count: number | null;
  overdue_count: number | null;
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

const statusTones: Record<PromiseStatus, string> = {
  active: "bg-white/5 text-emerald-200 border border-white/10",
  completed_by_promisor: "bg-amber-500/10 text-amber-100 border border-amber-300/40",
  confirmed: "bg-emerald-500/10 text-emerald-100 border border-emerald-300/40",
  disputed: "bg-red-500/10 text-red-100 border border-red-300/40",
};

const isOverdue = (dueAt: string | null) => {
  if (!dueAt) return false;
  return new Date(dueAt).getTime() < Date.now();
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
  const [promises, setPromises] = useState<PublicPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

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
          "handle,display_name,avatar_url,confirmed_count,disputed_count,active_count,pending_acceptance_count,overdue_count"
        )
        .eq("handle", handle)
        .maybeSingle();

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
  const confirmedCount = profile?.confirmed_count ?? 0;
  const disputedCount = profile?.disputed_count ?? 0;
  const activeCount = profile?.active_count ?? 0;
  const pendingAcceptanceCount = profile?.pending_acceptance_count ?? 0;
  const overdueCount = profile?.overdue_count ?? 0;
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

  const overdueItems = useMemo(
    () =>
      promises.filter(
        (promise) =>
          isOverdue(promise.due_at) &&
          (promise.status === "active" || promise.status === "completed_by_promisor")
      ),
    [promises]
  );

  const awaitingAcceptanceItems = useMemo(
    () =>
      promises.filter(
        (promise) =>
          promise.status === "active" && !isOverdue(promise.due_at)
      ),
    [promises]
  );

  const inProgressWithOutcomeItems = useMemo(
    () =>
      promises.filter(
        (promise) =>
          (promise.status === "active" || promise.status === "completed_by_promisor") &&
          !isOverdue(promise.due_at)
      ),
    [promises]
  );

  const recentConfirmations = useMemo(() => {
    const finalized = promises.filter(
      (promise) => promise.status === "confirmed" || promise.status === "disputed"
    );
    return finalized
      .sort((a, b) => {
        const aDate = new Date(a.confirmed_at ?? a.disputed_at ?? a.created_at).getTime();
        const bDate = new Date(b.confirmed_at ?? b.disputed_at ?? b.created_at).getTime();
        return bDate - aDate;
      })
      .slice(0, 5);
  }, [promises]);

  const statusLabels: Partial<Record<PromiseStatus, string>> = {
    active: t("publicProfile.status.inProgress"),
    completed_by_promisor: t("publicProfile.status.awaitingOutcome"),
    confirmed: t("home.recentDeals.status.confirmed"),
    disputed: t("home.recentDeals.status.disputed"),
  };

  const activeSummaryEmpty = activeCount + pendingAcceptanceCount + overdueCount === 0;
  const trackRecordEmpty = confirmedCount + disputedCount === 0;

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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">
                    {t("publicProfile.sections.responsibilityStatus")}
                  </h2>
                  {activeSummaryEmpty ? (
                    <span className="text-sm text-white/60">
                      {t("publicProfile.emptyStatus")}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/50">
                      {t("publicProfile.status.active")}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-emerald-200">{activeCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/50">
                      {t("publicProfile.status.pendingAcceptance")}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-amber-200">
                      {pendingAcceptanceCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/50">
                      {t("publicProfile.status.overdue")}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-red-200">{overdueCount}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h2 className="text-lg font-semibold">{t("publicProfile.sections.whatsHappening")}</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    {t("publicProfile.status.inProgress")}
                  </p>
                  {inProgressWithOutcomeItems.length === 0 ? (
                    <p className="mt-3 text-sm text-white/60">
                      {t("publicProfile.emptyInProgress")}
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-col gap-3">
                      {inProgressWithOutcomeItems.map((promise) => (
                        <div key={`${promise.title}-${promise.created_at}`}>
                          <p className="text-sm font-medium text-white">{promise.title}</p>
                          <p className="text-xs text-white/50">
                            {promise.due_at
                              ? t("publicProfile.meta.due", { date: formatDateShort(promise.due_at) })
                              : t("publicProfile.meta.noDue")}
                          </p>
                          <span className="mt-2 inline-flex w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-wide text-white/70">
                            {promise.status === "completed_by_promisor"
                              ? t("publicProfile.status.awaitingOutcome")
                              : t("publicProfile.status.inProgress")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    {t("publicProfile.status.awaitingAcceptance")}
                  </p>
                  {awaitingAcceptanceItems.length === 0 ? (
                    <p className="mt-3 text-sm text-white/60">
                      {t("publicProfile.emptyAwaitingAcceptance")}
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-col gap-3">
                      {awaitingAcceptanceItems.map((promise) => (
                        <div key={`${promise.title}-${promise.created_at}`}>
                          <p className="text-sm font-medium text-white">{promise.title}</p>
                          <p className="text-xs text-white/50">
                            {promise.due_at
                              ? t("publicProfile.meta.due", { date: formatDateShort(promise.due_at) })
                              : t("publicProfile.meta.noDue")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    {t("publicProfile.status.overdue")}
                  </p>
                  {overdueItems.length === 0 ? (
                    <p className="mt-3 text-sm text-white/60">{t("publicProfile.emptyOverdue")}</p>
                  ) : (
                    <div className="mt-3 flex flex-col gap-3">
                      {overdueItems.map((promise) => (
                        <div key={`${promise.title}-${promise.created_at}`}>
                          <p className="text-sm font-medium text-white">{promise.title}</p>
                          <p className="text-xs text-white/50">
                            {promise.due_at
                              ? t("publicProfile.meta.overdue", {
                                  date: formatDateShort(promise.due_at),
                                })
                              : t("publicProfile.meta.noDue")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t("publicProfile.sections.trackRecord")}</h2>
                {trackRecordEmpty ? (
                  <span className="text-sm text-white/60">{t("publicProfile.emptyHistory")}</span>
                ) : null}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    {t("publicProfile.confirmed")}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-200">{confirmedCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    {t("publicProfile.disputed")}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-red-200">{disputedCount}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {t("publicProfile.sections.recentConfirmations")}
                </h2>
              </div>
              {recentConfirmations.length === 0 ? (
                <p className="text-sm text-white/60">{t("publicProfile.emptyRecent")}</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {recentConfirmations.map((promise) => {
                    const finalizedAt =
                      promise.confirmed_at ?? promise.disputed_at ?? promise.created_at;
                    return (
                      <div
                        key={`${promise.title}-${promise.created_at}`}
                        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{promise.title}</p>
                          <p className="text-xs text-white/50">
                            {t("publicProfile.recentDealsMeta", {
                              date: formatDateShort(finalizedAt),
                            })}
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

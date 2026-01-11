"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requireSupabase } from "@/lib/supabaseClient";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { PromiseRole, isAwaitingOthers, isAwaitingYourAction } from "@/lib/promiseActions";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";

type PromiseRow = {
  id: string;
  title: string;
  status: PromiseStatus;
  due_at: string | null;
  created_at: string;
  completed_at: string | null;
  counterparty_id: string | null;
  creator_id: string; // ✅ was optional; selected in query, so make it required for correct role typing
  promisor_id: string | null;
  promisee_id: string | null;
};

type TabKey = "i-promised" | "promised-to-me";
type PromiseWithRole = PromiseRow & { role: PromiseRole; acceptedBySecondSide: boolean };
type ProfileSettingsRow = { is_public_profile: boolean | null };

export default function PromisesClient() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab: TabKey = (searchParams.get("tab") as TabKey) ?? "i-promised";

  const formatDue = (dueAt: string | null) => {
    if (!dueAt) return t("promises.list.noDeadline");
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dueAt));
  };

  const statusLabelForRole = (status: PromiseStatus, role: PromiseRole) => {
    if (role === "promisor") {
      if (status === "active") return t("promises.status.active");
      if (status === "completed_by_promisor") return t("promises.status.pendingConfirmation");
      if (status === "confirmed") return t("promises.status.confirmed");
      if (status === "disputed") return t("promises.status.disputed");
    }

    if (status === "active") return t("promises.status.pendingCompletion");
    if (status === "completed_by_promisor") return t("promises.status.needsReview");
    if (status === "confirmed") return t("promises.status.confirmed");
    if (status === "disputed") return t("promises.status.disputed");

    return status;
  };

  const [allRows, setAllRows] = useState<PromiseWithRole[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [profilePublic, setProfilePublic] = useState<boolean | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const supabaseErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Authentication is unavailable in this preview.";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      let supabase;
      try {
        supabase = requireSupabase();
      } catch (error) {
        setError(supabaseErrorMessage(error));
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        window.location.href = `/login?next=${encodeURIComponent("/promises")}`;
        return;
      }

      const user = session.user;

      const { data, error } = await supabase
        .from("promises")
        // accepted_by_second_side is a derived state (not a DB column); compute it locally for UI gating
        .select(
          "id,title,status,due_at,created_at,completed_at,counterparty_id,creator_id,promisor_id,promisee_id"
        )
        .or(
          `promisor_id.eq.${user.id},promisee_id.eq.${user.id},creator_id.eq.${user.id},counterparty_id.eq.${user.id}`
        )
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) setError(error.message);
      else {
        // ✅ Explicitly type the result as PromiseWithRole[] so role can't widen to string
        const filtered: PromiseWithRole[] = (data ?? [])
          .filter((row) => isPromiseStatus((row as { status?: unknown }).status))
          .map((row) => {
            const r = row as PromiseRow; // supabase returns loosely typed rows; we narrow to our shape
            const isPromisor =
              (r.promisor_id ? r.promisor_id === user.id : false) ||
              (!r.promisee_id && r.creator_id === user.id);
            const isPromisee =
              (r.promisee_id ? r.promisee_id === user.id : false) ||
              (!r.promisee_id && r.counterparty_id === user.id);
            const role: PromiseRole = isPromisor ? "promisor" : "counterparty";
            return {
              ...r,
              status: r.status as PromiseStatus,
              role,
              acceptedBySecondSide: Boolean(r.counterparty_id ?? (r.promisor_id && r.promisee_id)),
            };
          });

        setAllRows(filtered);
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("is_public_profile")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
      } else {
        const profileRow = profileData as ProfileSettingsRow | null;
        setProfilePublic(profileRow?.is_public_profile ?? false);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setTab = (next: TabKey) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", next);
    router.push(`/promises?${sp.toString()}`);
  };

  const roleCounts = useMemo(
    () =>
      allRows.reduce(
        (acc, row) => {
          if (row.role === "promisor") acc.promisor += 1;
          else if (row.role === "counterparty") acc.counterparty += 1;
          else acc.uncategorized.push(row.id);
          return acc;
        },
        { promisor: 0, counterparty: 0, uncategorized: [] as string[] }
      ),
    [allRows]
  );

  const tabRows = useMemo(
    () =>
      allRows.filter((row) =>
        tab === "i-promised" ? row.role === "promisor" : row.role === "counterparty"
      ),
    [allRows, tab]
  );

  const rows = tabRows;

  const overview = useMemo(() => {
    const total = allRows.length;
    const awaitingYou = allRows.filter((row) => isAwaitingYourAction(row)).length;
    const awaitingOthers = allRows.filter((row) => isAwaitingOthers(row)).length;

    return { total, awaitingYou, awaitingOthers };
  }, [allRows]);

  useEffect(() => {
    const categorizedTotal = roleCounts.promisor + roleCounts.counterparty;
    if (
      process.env.NODE_ENV !== "production" &&
      categorizedTotal !== allRows.length
    ) {
      console.warn("[promises] Tab counts do not sum to total", {
        total: allRows.length,
        promisorCount: roleCounts.promisor,
        counterpartyCount: roleCounts.counterparty,
        uncategorizedIds: roleCounts.uncategorized,
      });
    }
  }, [allRows.length, roleCounts.counterparty, roleCounts.promisor, roleCounts.uncategorized]);

  const handleMarkCompleted = async (promiseId: string) => {
    setBusyMap((m) => ({ ...m, [promiseId]: true }));
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push(`/login?next=${encodeURIComponent("/promises")}`);
        return;
      }

      const res = await fetch(`/api/promises/${promiseId}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t("promises.list.errors.markComplete"));
      }

      setAllRows((prev) =>
        prev.map((row) =>
          row.id === promiseId
            ? { ...row, status: "completed_by_promisor" as PromiseStatus }
            : row
        )
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("promises.list.errors.updateFailed")
      );
    } finally {
      setBusyMap((m) => ({ ...m, [promiseId]: false }));
    }
  };

  const metricValueClass = "mt-1 text-base font-semibold leading-tight";

  const updateProfilePublic = async (nextValue: boolean) => {
    setProfileBusy(true);
    setError(null);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (error) {
      setError(supabaseErrorMessage(error));
      setProfileBusy(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      window.location.href = `/login?next=${encodeURIComponent("/promises")}`;
      setProfileBusy(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_public_profile: nextValue })
      .eq("id", data.session.user.id);

    setProfileBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setProfilePublic(nextValue);
  };

  return (
    <main className="relative py-10">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(74,222,128,0.08),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(74,144,226,0.08),transparent_28%)]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-5xl px-6 space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.32em] text-emerald-200">
                {t("promises.overview.eyebrow")}
              </div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">{t("promises.overview.title")}</h1>
              <p className="text-sm text-slate-300">{t("promises.overview.subtitle")}</p>
            </div>

            <Link
              href="/promises/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50"
            >
              <span className="text-lg">＋</span>
              {t("promises.overview.cta")}
            </Link>
          </div>

          <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left shadow-inner shadow-black/30">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{t("promises.overview.metrics.total")}</div>
              <div className={`${metricValueClass} text-white`}>{overview.total}</div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-left text-emerald-100 shadow-inner shadow-black/30">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.overview.metrics.awaitingYou")}
              </div>
              <div className={metricValueClass}>{overview.awaitingYou}</div>
            </div>
            <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-left text-amber-50 shadow-inner shadow-black/30">
              <div className="text-xs uppercase tracking-[0.2em] text-amber-200">
                {t("promises.overview.metrics.awaitingOthers")}
              </div>
              <div className={metricValueClass}>{overview.awaitingOthers}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.32em] text-emerald-200">
                {t("promises.profile.eyebrow")}
              </div>
              <h2 className="text-lg font-semibold text-white">
                {t("promises.profile.publicTitle")}
              </h2>
              <p className="text-sm text-slate-300">{t("promises.profile.publicHelper")}</p>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-400"
                checked={Boolean(profilePublic)}
                disabled={profileBusy || profilePublic === null}
                onChange={(event) => updateProfilePublic(event.target.checked)}
              />
              <span className="text-xs uppercase tracking-[0.18em] text-slate-300">
                {profilePublic === null
                  ? t("promises.profile.loading")
                  : profilePublic
                  ? t("promises.profile.publicOn")
                  : t("promises.profile.publicOff")}
              </span>
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/30 p-4 shadow-xl shadow-black/30 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("i-promised")}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition",
                tab === "i-promised"
                  ? "bg-emerald-400 text-slate-950 ring-emerald-300 shadow-lg shadow-emerald-500/25"
                  : "bg-white/5 text-white ring-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              {t("promises.list.tabs.executorMe", { count: roleCounts.promisor })}
            </button>

            <button
              type="button"
              onClick={() => setTab("promised-to-me")}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition",
                tab === "promised-to-me"
                  ? "bg-emerald-400 text-slate-950 ring-emerald-300 shadow-lg shadow-emerald-500/25"
                  : "bg-white/5 text-white ring-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              {t("promises.list.tabs.executorOther", { count: roleCounts.counterparty })}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {loading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[102px] animate-pulse rounded-2xl bg-white/5" />
                ))}
              </div>
            )}

            {!loading &&
              rows.map((p) => {
                const isPromisor = p.role === "promisor";
                const waiting = p.status === "completed_by_promisor";
                const acceptedBySecondSide = p.acceptedBySecondSide;
                const impact = (() => {
                  if (!isPromisor) return null;

                  if (p.status === "confirmed") {
                    const onTime = Boolean(
                      p.due_at &&
                        p.completed_at &&
                        new Date(p.completed_at).getTime() <= new Date(p.due_at).getTime()
                    );
                    return `+${onTime ? 4 : 3}`;
                  }

                  if (p.status === "disputed") {
                    const late = Boolean(
                      p.due_at &&
                        p.completed_at &&
                        new Date(p.completed_at).getTime() > new Date(p.due_at).getTime()
                    );
                    return late ? "-7" : "-6";
                  }

                  return null;
                })();

                const actionLabel = isPromisor
                  ? p.status === "completed_by_promisor"
                    ? t("promises.status.waitingConfirmation")
                    : null
                  : waiting
                  ? t("promises.list.actionRequired")
                  : null;

                const statusLabel = statusLabelForRole(p.status, p.role);

                const busy = busyMap[p.id];

                return (
                  <div
                    key={p.id}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-300/40 hover:bg-emerald-500/5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-sm uppercase tracking-[0.18em] text-emerald-200">
                          {t("promises.list.cardLabel")}
                        </div>
                        <Link
                          href={`/promises/${p.id}`}
                          className="text-lg font-semibold text-white transition hover:text-emerald-100"
                        >
                          {p.title}
                        </Link>
                        <div className="text-sm text-slate-300">
                          {t("promises.list.dueLabel")}: {formatDue(p.due_at)}
                        </div>
                        {waiting && (
                          <p className="text-xs text-amber-200">
                            {isPromisor
                              ? t("promises.list.waitingNotePromisor")
                              : t("promises.list.waitingNoteCounterparty")}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 text-right text-sm text-slate-200">
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                          {statusLabel}
                        </span>
                        {actionLabel && <span className="text-xs text-amber-200">{actionLabel}</span>}

                        {impact && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                            {t("promises.list.scoreImpact", { impact })}
                          </span>
                        )}

                        {isPromisor && p.status === "active" && acceptedBySecondSide && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmingId(p.id)}
                            className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 disabled:opacity-60"
                          >
                            {busy ? t("promises.list.updating") : t("promises.list.markCompleted")}
                          </button>
                        )}

                        {isPromisor && p.status === "active" && !acceptedBySecondSide && (
                          <span className="text-xs text-slate-400">
                            {t("promises.status.awaitingInviteAcceptance")}
                          </span>
                        )}

                        {!isPromisor && p.status === "completed_by_promisor" && (
                          <Link
                            href={`/promises/${p.id}/confirm`}
                            className="inline-flex items-center justify-center rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-50 shadow-lg shadow-amber-900/30 transition hover:bg-amber-500/20"
                          >
                            {t("promises.list.reviewConfirm")}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

            {!loading && rows.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-slate-300">
                <p className="text-lg font-semibold text-white">{t("promises.empty.title")}</p>
                <p className="text-sm text-slate-400">
                  {tab === "i-promised"
                    ? t("promises.empty.promisorDescription")
                    : t("promises.empty.counterpartyDescription")}
                </p>
                <div className="mt-4">
                  <Link
                    href="/promises/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50"
                  >
                    {t("promises.empty.cta")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">
              {t("promises.confirmModal.title")}
            </h2>
            <p className="mt-3 text-sm text-neutral-200">
              {t("promises.confirmModal.body")}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmingId(null)}
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t("promises.confirmModal.cancel")}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = confirmingId;
                  setConfirmingId(null);
                  if (id) await handleMarkCompleted(id);
                }}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50"
              >
                {t("promises.confirmModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

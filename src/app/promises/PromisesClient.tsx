"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NewDealButton } from "@/app/components/NewDealButton";
import { requireSupabase } from "@/lib/supabaseClient";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { PromiseRole, isAwaitingOthers, isAwaitingYourAction } from "@/lib/promiseActions";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import { calc_score_impact } from "@/lib/reputation/calcScoreImpact";
import { formatDueDate } from "@/lib/formatDueDate";
import {
  getPromiseInviteStatus,
  isPromiseAccepted,
  InviteStatus,
} from "@/lib/promiseAcceptance";

type PromiseRow = {
  id: string;
  title: string;
  status: PromiseStatus;
  due_at: string | null;
  created_at: string;
  completed_at: string | null;
  condition_text: string | null;
  condition_met_at: string | null;
  counterparty_id: string | null;
  counterparty_accepted_at: string | null;
  invite_status: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  ignored_at: string | null;
  creator_id: string; // ✅ was optional; selected in query, so make it required for correct role typing
  promisor_id: string | null;
  promisee_id: string | null;
};

type TabKey = "i-promised" | "promised-to-me";
type PromiseRoleBase = Pick<
  PromiseRow,
  | "id"
  | "status"
  | "counterparty_accepted_at"
  | "invite_status"
  | "invited_at"
  | "accepted_at"
  | "declined_at"
  | "ignored_at"
  | "creator_id"
  | "promisor_id"
  | "promisee_id"
  | "counterparty_id"
>;
type PromiseWithRole = PromiseRow & { role: PromiseRole; inviteStatus: InviteStatus };
type PromiseSummary = PromiseRoleBase & { role: PromiseRole; inviteStatus: InviteStatus };

const PAGE_SIZE = 12;

const withRole = <T extends PromiseRoleBase>(row: T, userId: string) => {
  const executorId = resolveExecutorId(row);
  const role: PromiseRole =
    executorId && executorId === userId ? "promisor" : "counterparty";
  return {
    ...row,
    status: row.status as PromiseStatus,
    role,
    inviteStatus: getPromiseInviteStatus(row),
  };
};

const buildBaseFilter = (id: string) =>
  `promisor_id.eq.${id},promisee_id.eq.${id},creator_id.eq.${id},counterparty_id.eq.${id}`;

const buildPromisorFilter = (id: string) =>
  `promisor_id.eq.${id},and(promisor_id.is.null,promisee_id.is.null,creator_id.eq.${id})`;

const buildCounterpartyFilter = (id: string) =>
  // Regression test case: accepted deal where promisor_id === counterparty_id === userId
  // must not appear in the "Other executor" tab (only "I'm the executor").
  `promisee_id.eq.${id},and(counterparty_id.eq.${id},promisor_id.not.eq.${id}),and(creator_id.eq.${id},or(promisor_id.not.is.null,promisee_id.not.is.null),promisor_id.not.eq.${id})`;
export default function PromisesClient() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab: TabKey = (searchParams.get("tab") as TabKey) ?? "i-promised";

  const formatDue = (dueAt: string | null) => {
    if (!dueAt) return t("promises.list.noDeadline");
    return formatDueDate(dueAt, locale, { includeYear: true, includeTime: true }) ?? dueAt;
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

  const [summaryRows, setSummaryRows] = useState<PromiseSummary[]>([]);
  const [listRowsByTab, setListRowsByTab] = useState<Record<TabKey, PromiseWithRole[]>>({
    "i-promised": [],
    "promised-to-me": [],
  });
  const [pageByTab, setPageByTab] = useState<Record<TabKey, number>>({
    "i-promised": 0,
    "promised-to-me": 0,
  });
  const [hasMoreByTab, setHasMoreByTab] = useState<Record<TabKey, boolean>>({
    "i-promised": true,
    "promised-to-me": true,
  });
  const [listLoading, setListLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const supabaseErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Authentication is unavailable in this preview.";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);

      let supabase;
      try {
        supabase = requireSupabase();
      } catch (error) {
        setError(supabaseErrorMessage(error));
        setListLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        window.location.href = `/login?next=${encodeURIComponent("/promises")}`;
        return;
      }

      const user = session.user;
      setUserId(user.id);

      const { data, error } = await supabase
      .from("promises")
      .select(
        "id,status,condition_text,condition_met_at,counterparty_accepted_at,invite_status,invited_at,accepted_at,declined_at,ignored_at,creator_id,promisor_id,promisee_id,counterparty_id"
      )
      .or(buildBaseFilter(user.id));

      if (cancelled) return;

      if (error) setError(error.message);
      else {
        const filtered: PromiseSummary[] = (data ?? [])
          .filter((row) => isPromiseStatus((row as { status?: unknown }).status))
          .map((row) => withRole(row as PromiseRoleBase, user.id));

        setSummaryRows(filtered);
      }
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

  const fetchTabPage = async ({
    tabKey,
    page,
    replace,
  }: {
    tabKey: TabKey;
    page: number;
    replace: boolean;
  }) => {
    if (!userId) return;
    setError(null);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (error) {
      setError(supabaseErrorMessage(error));
      setListLoading(false);
      return;
    }

    const offset = page * PAGE_SIZE;
    const rangeEnd = offset + PAGE_SIZE - 1;
    const roleFilter =
      tabKey === "i-promised"
        ? buildPromisorFilter(userId)
        : buildCounterpartyFilter(userId);

    const { data, error } = await supabase
      .from("promises")
      .select(
        "id,title,status,due_at,created_at,completed_at,condition_text,condition_met_at,counterparty_id,counterparty_accepted_at,invite_status,invited_at,accepted_at,declined_at,ignored_at,creator_id,promisor_id,promisee_id"
      )
      .or(roleFilter)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, rangeEnd);

    if (error) {
      setError(error.message);
      return;
    }

    const parsed: PromiseWithRole[] = (data ?? [])
      .filter((row) => isPromiseStatus((row as { status?: unknown }).status))
      .map((row) => withRole(row as PromiseRow, userId));

    setListRowsByTab((prev) => ({
      ...prev,
      [tabKey]: replace ? parsed : [...prev[tabKey], ...parsed],
    }));
    setHasMoreByTab((prev) => ({
      ...prev,
      [tabKey]: parsed.length === PAGE_SIZE,
    }));
    setPageByTab((prev) => ({ ...prev, [tabKey]: page }));
  };

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const loadFirstPage = async () => {
      setListLoading(true);
      setHasMoreByTab((prev) => ({ ...prev, [tab]: true }));
      setPageByTab((prev) => ({ ...prev, [tab]: 0 }));
      setListRowsByTab((prev) => ({ ...prev, [tab]: [] }));
      await fetchTabPage({ tabKey: tab, page: 0, replace: true });
      if (!cancelled) setListLoading(false);
    };

    loadFirstPage();

    return () => {
      cancelled = true;
    };
  }, [tab, userId]);

  const roleCounts = useMemo(
    () =>
      summaryRows.reduce(
        (acc, row) => {
          if (row.role === "promisor") acc.promisor += 1;
          else if (row.role === "counterparty") acc.counterparty += 1;
          else acc.uncategorized.push(row.id);
          return acc;
        },
        { promisor: 0, counterparty: 0, uncategorized: [] as string[] }
      ),
    [summaryRows]
  );

  const rows = listRowsByTab[tab];

  const overview = useMemo(() => {
    const total = summaryRows.length;
    const awaitingYou = summaryRows.filter((row) => isAwaitingYourAction(row)).length;
    const awaitingOthers = summaryRows.filter((row) => isAwaitingOthers(row)).length;

    return { total, awaitingYou, awaitingOthers };
  }, [summaryRows]);

  useEffect(() => {
    const categorizedTotal = roleCounts.promisor + roleCounts.counterparty;
    if (
      process.env.NODE_ENV !== "production" &&
      categorizedTotal !== summaryRows.length
    ) {
      console.warn("[promises] Tab counts do not sum to total", {
        total: summaryRows.length,
        promisorCount: roleCounts.promisor,
        counterpartyCount: roleCounts.counterparty,
        uncategorizedIds: roleCounts.uncategorized,
      });
    }
  }, [
    roleCounts.counterparty,
    roleCounts.promisor,
    roleCounts.uncategorized,
    summaryRows.length,
  ]);

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

      setSummaryRows((prev) =>
        prev.map((row) =>
          row.id === promiseId ? { ...row, status: "completed_by_promisor" } : row
        )
      );
      setListRowsByTab((prev) => ({
        "i-promised": prev["i-promised"].map((row) =>
          row.id === promiseId ? { ...row, status: "completed_by_promisor" } : row
        ),
        "promised-to-me": prev["promised-to-me"].map((row) =>
          row.id === promiseId ? { ...row, status: "completed_by_promisor" } : row
        ),
      }));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("promises.list.errors.updateFailed")
      );
    } finally {
      setBusyMap((m) => ({ ...m, [promiseId]: false }));
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || listLoading || !hasMoreByTab[tab]) return;
    const nextPage = pageByTab[tab] + 1;
    setLoadingMore(true);
    try {
      await fetchTabPage({ tabKey: tab, page: nextPage, replace: false });
    } finally {
      setLoadingMore(false);
    }
  };

  const metricValueClass = "mt-1 text-base font-semibold leading-tight";

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

            <NewDealButton label={t("promises.overview.cta")} />
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

        <div className="rounded-3xl border border-white/10 bg-black/30 p-4 shadow-xl shadow-black/30 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("i-promised")}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                tab === "i-promised"
                  ? "cursor-default bg-emerald-400 text-slate-950 ring-emerald-300 shadow-lg shadow-emerald-500/25"
                  : "cursor-pointer bg-white/5 text-white ring-white/10 hover:bg-white/10 hover:ring-white/20",
              ].join(" ")}
            >
              {t("promises.list.tabs.executorMe", { count: roleCounts.promisor })}
            </button>

            <button
              type="button"
              onClick={() => setTab("promised-to-me")}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                tab === "promised-to-me"
                  ? "cursor-default bg-emerald-400 text-slate-950 ring-emerald-300 shadow-lg shadow-emerald-500/25"
                  : "cursor-pointer bg-white/5 text-white ring-white/10 hover:bg-white/10 hover:ring-white/20",
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
            {listLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[102px] animate-pulse rounded-2xl bg-white/5" />
                ))}
              </div>
            )}

            {!listLoading &&
              rows.map((p) => {
                const isPromisor = p.role === "promisor";
                const waiting = p.status === "completed_by_promisor";
                const inviteStatus = p.inviteStatus;
                const acceptedBySecondSide = isPromiseAccepted(p);
                const impact = (() => {
                  if (!isPromisor) return null;

                  if (p.status === "confirmed" || p.status === "disputed") {
                    const delta = calc_score_impact({
                      status: p.status,
                      due_at: p.due_at,
                      completed_at: p.completed_at,
                    });
                    return delta >= 0 ? `+${delta}` : `${delta}`;
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
                const blockedByCondition =
                  Boolean(p.condition_text?.trim()) && !p.condition_met_at;

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
                          className="text-lg font-semibold text-white transition hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
                        {blockedByCondition && (
                          <p className="text-xs text-slate-400">
                            {t("promises.list.blockedByCondition")}
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
                            className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:shadow-none"
                          >
                            {busy ? t("promises.list.updating") : t("promises.list.markCompleted")}
                          </button>
                        )}

                        {isPromisor && p.status === "active" && !acceptedBySecondSide && (
                          <span className="text-xs text-slate-400">
                            {t(`promises.inviteStatus.${inviteStatus}`)}
                          </span>
                        )}

                        {!isPromisor && p.status === "completed_by_promisor" && (
                          <Link
                            href={`/promises/${p.id}/confirm`}
                            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-50 shadow-lg shadow-amber-900/30 transition hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                          >
                            {t("promises.list.reviewConfirm")}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

            {!listLoading && rows.length === 0 && (
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
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    {t("promises.empty.cta")}
                  </Link>
                </div>
              </div>
            )}

            {!listLoading && rows.length > 0 && hasMoreByTab[tab] && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white/5"
                >
                  {loadingMore ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      {t("promises.list.loadingMore")}
                    </>
                  ) : (
                    t("promises.list.loadMore")
                  )}
                </button>
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
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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

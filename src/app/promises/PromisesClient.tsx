"use client";

import Link from "next/link";
import { CheckCircle2, BadgeCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NewDealButton } from "@/app/components/NewDealButton";
import { IconButton } from "@/app/components/ui/IconButton";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { requireSupabase } from "@/lib/supabaseClient";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { PromiseRole, isAwaitingOthers, isAwaitingYourAction } from "@/lib/promiseActions";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import { formatDealMeta } from "@/lib/formatDealMeta";
import {
  getPromiseInviteStatus,
  isPromiseAccepted,
  InviteStatus,
} from "@/lib/promiseAcceptance";
import { getPromiseUiStatus, PromiseUiStatus } from "@/lib/promiseUiStatus";

type PromiseRow = {
  id: string;
  title: string;
  status: PromiseStatus;
  due_at: string | null;
  created_at: string;
  completed_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
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
type MetricFilter = "total" | "awaiting_my_action" | "awaiting_others";
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
type PromiseWithRole = PromiseRow & {
  role: PromiseRole;
  inviteStatus: InviteStatus;
  uiStatus: PromiseUiStatus;
  isReviewer: boolean;
};
type PromiseSummary = PromiseRoleBase & {
  role: PromiseRole;
  inviteStatus: InviteStatus;
  uiStatus: PromiseUiStatus;
  isReviewer: boolean;
};

type ReminderInfo = {
  count: number;
  lastSentAt: string | null;
};

const PAGE_SIZE = 12;

const withRole = <T extends PromiseRoleBase>(row: T, userId: string) => {
  const executorId = resolveExecutorId(row);
  const isReviewer = executorId !== userId;
  const role: PromiseRole =
    executorId && executorId === userId ? "promisor" : "counterparty";
  return {
    ...row,
    status: row.status as PromiseStatus,
    role,
    inviteStatus: getPromiseInviteStatus(row),
    uiStatus: getPromiseUiStatus(row),
    isReviewer,
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

  const dealMetaLabels = useMemo(
    () => ({
      created: (date: string) => t("deal.meta.created", { date }),
      due: (date: string) => t("deal.meta.due", { date }),
      closed: (date: string) => t("deal.meta.closed", { date }),
    }),
    [t]
  );

  const statusLabelForRole = (
    status: PromiseStatus,
    role: PromiseRole,
    uiStatus: PromiseUiStatus
  ) => {
    if (uiStatus === "awaiting_acceptance") return t("promises.status.awaitingInviteAcceptance");
    if (uiStatus === "declined") return t("promises.inviteStatus.declined");
    if (uiStatus === "ignored") return t("promises.inviteStatus.ignored");

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
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [reminderInfoByDeal, setReminderInfoByDeal] = useState<Record<string, ReminderInfo>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeMetricFilter, setActiveMetricFilter] = useState<MetricFilter>("total");

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
    const rangeEnd = offset + PAGE_SIZE;
    const roleFilter =
      tabKey === "i-promised"
        ? buildPromisorFilter(userId)
        : buildCounterpartyFilter(userId);

    const { data, error } = await supabase
      .from("promises")
      .select(
        "id,title,status,due_at,created_at,completed_at,confirmed_at,disputed_at,condition_text,condition_met_at,counterparty_id,counterparty_accepted_at,invite_status,invited_at,accepted_at,declined_at,ignored_at,creator_id,promisor_id,promisee_id"
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
    const nextHasMore = parsed.length > PAGE_SIZE;
    const pageRows = nextHasMore ? parsed.slice(0, PAGE_SIZE) : parsed;

    setListRowsByTab((prev) => ({
      ...prev,
      [tabKey]: replace ? pageRows : [...prev[tabKey], ...pageRows],
    }));
    setHasMoreByTab((prev) => ({
      ...prev,
      [tabKey]: nextHasMore,
    }));
    setPageByTab((prev) => ({ ...prev, [tabKey]: page }));
  };

  const loadReminderInfo = async (ids: string[]) => {
    if (!ids.length) return;

    let supabase;
    try {
      supabase = requireSupabase();
    } catch {
      return;
    }

    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    const res = await fetch(`/api/promises/reminders/summary?ids=${encodeURIComponent(ids.join(","))}`, {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    });

    if (!res.ok) return;

    const body = await res.json().catch(() => null) as
      | { reminders?: Record<string, ReminderInfo> }
      | null;
    if (!body?.reminders) return;

    setReminderInfoByDeal((prev) => ({ ...prev, ...body.reminders }));
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

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (listLoading) return;
    const sourceRows = listRowsByTab[tab] ?? [];
    const filteredRows =
      activeMetricFilter === "awaiting_my_action"
        ? sourceRows.filter((row) => isAwaitingYourAction(row))
        : activeMetricFilter === "awaiting_others"
          ? sourceRows.filter((row) => isAwaitingOthers(row))
          : sourceRows;

    void loadReminderInfo(filteredRows.map((row) => row.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMetricFilter, listLoading, listRowsByTab, tab]);

  const handleSendReminder = async (promiseId: string) => {
    setError(null);
    setSendingReminderId(promiseId);
    try {
      const supabase = requireSupabase();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push(`/login?next=${encodeURIComponent("/promises")}`);
        return;
      }

      const res = await fetch(`/api/promises/${promiseId}/reminder`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? t("promises.list.reminder.sendFailed"));
      }

      setReminderInfoByDeal((prev) => ({
        ...prev,
        [promiseId]: {
          count: body.count ?? (prev[promiseId]?.count ?? 0) + 1,
          lastSentAt: body.created_at ?? new Date().toISOString(),
        },
      }));
      setToast(t("promises.list.reminder.sent"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("promises.list.reminder.sendFailed"));
    } finally {
      setSendingReminderId(null);
    }
  };

  const isReminderCoolingDown = (lastSentAt: string | null) => {
    if (!lastSentAt) return false;
    const diff = Date.now() - new Date(lastSentAt).getTime();
    return diff < 24 * 60 * 60 * 1000;
  };

  const applyMetricFilter = <T extends PromiseSummary | PromiseWithRole>(
    rows: T[]
  ): T[] => {
    if (activeMetricFilter === "awaiting_my_action") {
      return rows.filter((row) => isAwaitingYourAction(row));
    }
    if (activeMetricFilter === "awaiting_others") {
      return rows.filter((row) => isAwaitingOthers(row));
    }
    return rows;
  };

  const filteredSummaryRows = useMemo(
    () => applyMetricFilter(summaryRows),
    [summaryRows, activeMetricFilter]
  );

  const roleCounts = useMemo(
    () =>
      filteredSummaryRows.reduce(
        (acc, row) => {
          if (row.role === "promisor") acc.promisor += 1;
          else if (row.role === "counterparty") acc.counterparty += 1;
          else acc.uncategorized.push(row.id);
          return acc;
        },
        { promisor: 0, counterparty: 0, uncategorized: [] as string[] }
      ),
    [filteredSummaryRows]
  );

  const filteredListRowsByTab = useMemo(
    () => ({
      "i-promised": applyMetricFilter(listRowsByTab["i-promised"]),
      "promised-to-me": applyMetricFilter(listRowsByTab["promised-to-me"]),
    }),
    [listRowsByTab, activeMetricFilter]
  );

  const rows = filteredListRowsByTab[tab];
  const totalPromises = summaryRows.length;
  const isListEmpty = !listLoading && rows.length === 0;
  const isGlobalEmpty = isListEmpty && totalPromises === 0;
  const isAwaitingMyActionEmpty =
    isListEmpty && totalPromises > 0 && activeMetricFilter === "awaiting_my_action";
  const isFilteredEmpty = isListEmpty && totalPromises > 0 && !isAwaitingMyActionEmpty;
  const showAllAction = isListEmpty && totalPromises > 0 && activeMetricFilter !== "total";
  const emptyTitle = isGlobalEmpty
    ? t("promises.empty.title")
    : isAwaitingMyActionEmpty
      ? t("promises.empty.awaitingYourActionTitle")
      : t("promises.empty.filteredTitle");
  const emptyDescription = isGlobalEmpty
    ? t("promises.empty.globalDescription")
    : isAwaitingMyActionEmpty
      ? t("promises.empty.awaitingYourActionDescription")
      : t("promises.empty.filteredDescription");

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
      categorizedTotal !== filteredSummaryRows.length
    ) {
      console.warn("[promises] Tab counts do not sum to total", {
        total: filteredSummaryRows.length,
        promisorCount: roleCounts.promisor,
        counterpartyCount: roleCounts.counterparty,
        uncategorizedIds: roleCounts.uncategorized,
      });
    }
  }, [
    roleCounts.counterparty,
    roleCounts.promisor,
    roleCounts.uncategorized,
    filteredSummaryRows.length,
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
  const metricBaseClass =
    "rounded-2xl border px-4 py-3 text-left shadow-inner shadow-black/30 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

  const handleMetricClick = (next: MetricFilter) => {
    setActiveMetricFilter((current) =>
      current === next && next !== "total" ? "total" : next
    );
  };

  return (
    <main className="relative py-10">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100 shadow-lg shadow-emerald-900/40">
          {toast}
        </div>
      )}

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
            <button
              type="button"
              onClick={() => handleMetricClick("total")}
              aria-pressed={activeMetricFilter === "total"}
              className={[
                metricBaseClass,
                "cursor-pointer border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10",
                activeMetricFilter === "total"
                  ? "ring-2 ring-emerald-400/60"
                  : "active:scale-[0.99]",
              ].join(" ")}
            >
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {t("promises.overview.metrics.total")}
              </div>
              <div className={`${metricValueClass} text-white`}>{overview.total}</div>
            </button>
            <button
              type="button"
              onClick={() => handleMetricClick("awaiting_my_action")}
              aria-pressed={activeMetricFilter === "awaiting_my_action"}
              className={[
                metricBaseClass,
                "cursor-pointer border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300/40 hover:bg-emerald-500/15",
                activeMetricFilter === "awaiting_my_action"
                  ? "ring-2 ring-emerald-300/70"
                  : "active:scale-[0.99]",
              ].join(" ")}
            >
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.overview.metrics.awaitingYou")}
              </div>
              <div className={metricValueClass}>{overview.awaitingYou}</div>
            </button>
            <button
              type="button"
              onClick={() => handleMetricClick("awaiting_others")}
              aria-pressed={activeMetricFilter === "awaiting_others"}
              className={[
                metricBaseClass,
                "cursor-pointer border-amber-300/30 bg-amber-400/10 text-amber-50 hover:border-amber-300/60 hover:bg-amber-400/15",
                activeMetricFilter === "awaiting_others"
                  ? "ring-2 ring-amber-300/70"
                  : "active:scale-[0.99]",
              ].join(" ")}
            >
              <div className="text-xs uppercase tracking-[0.2em] text-amber-200">
                {t("promises.overview.metrics.awaitingOthers")}
              </div>
              <div className={metricValueClass}>{overview.awaitingOthers}</div>
            </button>
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
                const canReview = p.isReviewer;
                const canSendReminder = canReview && p.status === "active";
                const isDeclined = p.uiStatus === "declined" || p.status === "declined";
                const acceptedBySecondSide = isPromiseAccepted(p);
                const reminderInfo = reminderInfoByDeal[p.id] ?? { count: 0, lastSentAt: null };
                const reminderCooldown = isReminderCoolingDown(reminderInfo.lastSentAt);

                const statusLabel = statusLabelForRole(p.status, p.role, p.uiStatus);

                const busy = busyMap[p.id];
                const dealMeta = isDeclined
                  ? formatDealMeta(
                      {
                        status: "active",
                        created_at: p.created_at,
                      },
                      locale,
                      dealMetaLabels
                    )
                  : formatDealMeta(p, locale, dealMetaLabels);

                return (
                  <div
                    key={p.id}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-300/40 hover:bg-emerald-500/5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <Link
                          href={`/promises/${p.id}?from=deals`}
                          className="text-lg font-semibold text-white transition hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          {p.title}
                        </Link>
                        <div className="text-xs text-slate-400">{dealMeta}</div>
                      </div>

                      <div className="flex flex-col items-end gap-2 text-right text-sm text-slate-200">
                        {canSendReminder && (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleSendReminder(p.id)}
                              disabled={sendingReminderId === p.id || reminderCooldown}
                              className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:border-amber-300/50 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {sendingReminderId === p.id
                                ? t("promises.list.reminder.sending")
                                : t("promises.list.reminder.button")}
                            </button>
                            {reminderInfo.count > 0 && (
                              <div className="text-[11px] text-slate-400">
                                {t("promises.list.reminder.count", { count: reminderInfo.count })}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                          {statusLabel}
                        </span>

                        {isPromisor && p.status === "active" && acceptedBySecondSide && (
                          <Tooltip label={t("promises.list.markCompleted")} placement="top">
                            <IconButton
                              icon={<CheckCircle2 className="h-4 w-4" />}
                              ariaLabel={t("promises.list.markCompleted")}
                              onClick={() => setConfirmingId(p.id)}
                              disabled={busy}
                              className="h-9 w-9"
                            />
                          </Tooltip>
                        )}

                        {canReview && p.status === "completed_by_promisor" && (
                          <Tooltip label={t("promises.list.reviewConfirm")} placement="top">
                            <IconButton
                              href={`/promises/${p.id}/confirm`}
                              icon={<BadgeCheck className="h-4 w-4" />}
                              ariaLabel={t("promises.list.reviewConfirm")}
                              className="h-9 w-9"
                            />
                          </Tooltip>
                        )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            {isListEmpty && (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-slate-300">
                <p className="text-lg font-semibold text-white">{emptyTitle}</p>
                <p className="text-sm text-slate-400">{emptyDescription}</p>
                {isGlobalEmpty && (
                  <div className="mt-4">
                    <Link
                      href="/promises/new"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                      {t("promises.empty.cta")}
                    </Link>
                  </div>
                )}
                {isFilteredEmpty && showAllAction && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setActiveMetricFilter("total")}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                      {t("promises.empty.showAll")}
                    </button>
                  </div>
                )}
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

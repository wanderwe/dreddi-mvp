"use client";

import { LocalizedLink } from "@/app/components/LocalizedLink";
import { CheckCircle2, BadgeCheck, BellRing, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NewDealButton } from "@/app/components/NewDealButton";
import { IconButton } from "@/app/components/ui/IconButton";
import { StatusPill, StatusPillTone } from "@/app/components/ui/StatusPill";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { requireSupabase } from "@/lib/supabaseClient";
import { productFlags } from "@/lib/config/productFlags";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { PromiseRole, isAwaitingOthers, isAwaitingYourAction } from "@/lib/promiseActions";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import { getNextActionOwner } from "@/lib/promiseNextAction";
import { formatDealMeta } from "@/lib/formatDealMeta";
import { getPromiseLabels } from "@/lib/promiseLabels";
import {
  getPromiseInviteStatus,
  isPromiseAccepted,
  InviteStatus,
} from "@/lib/promiseAcceptance";
import { getPromiseUiStatus, PromiseUiStatus } from "@/lib/promiseUiStatus";

type PromiseRow = {
  id: string;
  title: string;
  is_important: boolean;
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
  expires_at: string | null;
  cancelled_at: string | null;
  creator_id: string; // ✅ was optional; selected in query, so make it required for correct role typing
  promisor_id: string | null;
  promisee_id: string | null;
  visibility: "public" | "private" | null;
  collective_agreement_id: string | null;
};

type PagedTabKey = "i-promised" | "promised-to-me" | "all";
type TabKey = PagedTabKey | "all";
const isTabKey = (value: string | null): value is TabKey =>
  value === "i-promised" || value === "promised-to-me" || value === "all";

const normalizeTabParam = (value: string | null): TabKey => {
  if (value === "i-am-executor") return "i-promised";
  if (isTabKey(value)) return value;
  return "all";
};

type MetricFilter = "total" | "awaiting_my_action" | "awaiting_others";
type StatusFilter = string;
type DealTypeFilter = "all" | "public" | "private" | "reputation_stake";
type PromiseRoleBase = Pick<
  PromiseRow,
  | "id"
  | "status"
  | "created_at"
  | "completed_at"
  | "confirmed_at"
  | "disputed_at"
  | "counterparty_accepted_at"
  | "invite_status"
  | "invited_at"
  | "accepted_at"
  | "declined_at"
  | "ignored_at"
  | "due_at"
  | "title"
  | "is_important"
  | "creator_id"
  | "promisor_id"
  | "promisee_id"
  | "counterparty_id"
  | "visibility"
  | "collective_agreement_id"
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
const STATUS_FILTER_ALL = "all";
const STATUS_FILTER_OVERDUE = "overdue";
const STATUS_FILTER_UI_PREFIX = "ui:";
const DEAL_TYPE_FILTER_ALL: DealTypeFilter = "all";

const normalizeDealTypeParam = (typeValue: string | null, visibilityValue: string | null): DealTypeFilter => {
  if (typeValue === "public" || typeValue === "private" || typeValue === "reputation_stake") return typeValue;
  if (visibilityValue === "public" || visibilityValue === "private") return visibilityValue;
  return DEAL_TYPE_FILTER_ALL;
};


const isPromiseRoleBase = (row: unknown): row is PromiseRoleBase => {
  if (!row || typeof row !== "object") return false;
  const candidate = row as Record<string, unknown>;
  return (
    typeof candidate.id === "string"
    && typeof candidate.title === "string"
    && typeof candidate.created_at === "string"
    && typeof candidate.is_important === "boolean"
    && typeof candidate.creator_id === "string"
    && isPromiseStatus(candidate.status)
  );
};


const isPromiseRow = (row: unknown): row is PromiseRow => {
  if (!row || typeof row !== "object") return false;
  const candidate = row as Record<string, unknown>;
  return (
    typeof candidate.id === "string"
    && typeof candidate.title === "string"
    && typeof candidate.created_at === "string"
    && typeof candidate.is_important === "boolean"
    && typeof candidate.creator_id === "string"
    && typeof candidate.is_important === "boolean"
    && isPromiseStatus(candidate.status)
  );
};

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
  `promisor_id.eq.${id},and(promisor_id.is.null,promisee_id.is.null,creator_id.eq.${id}),and(promisor_id.is.null,counterparty_id.eq.${id},promisee_id.not.eq.${id})`;

const buildCounterpartyFilter = (id: string) =>
  // Regression test case: accepted deal where promisor_id === counterparty_id === userId
  // must not appear in the "Other executor" tab (only "I'm the executor").
  `promisee_id.eq.${id},and(counterparty_id.eq.${id},promisor_id.not.eq.${id}),and(creator_id.eq.${id},or(promisor_id.not.is.null,promisee_id.not.is.null),promisor_id.not.eq.${id})`;

const toUiStatusFilterValue = (uiStatus: PromiseUiStatus) =>
  `${STATUS_FILTER_UI_PREFIX}${uiStatus}`;

const fromUiStatusFilterValue = (value: string): PromiseUiStatus | null => {
  if (!value.startsWith(STATUS_FILTER_UI_PREFIX)) return null;
  const uiStatus = value.slice(STATUS_FILTER_UI_PREFIX.length);
  return uiStatus.length ? (uiStatus as PromiseUiStatus) : null;
};

const normalizeStatusParam = (value: string | null): StatusFilter => {
  if (!value || value === STATUS_FILTER_ALL) return STATUS_FILTER_ALL;
  if (value === STATUS_FILTER_OVERDUE) return STATUS_FILTER_OVERDUE;
  if (value.startsWith(STATUS_FILTER_UI_PREFIX)) return value;

  if (value === "needs_review") return toUiStatusFilterValue("completed_by_promisor");
  return toUiStatusFilterValue(value as PromiseUiStatus);
};

function DealTitleLink({ id, title, href }: { id: string; title: string; href?: string }) {
  const titleRef = useRef<HTMLSpanElement | null>(null);

  const isCurrentlyTruncated = () => {
    const container = titleRef.current;
    if (!container) return false;
    const link = container.querySelector("a");
    if (!link) return false;
    return link.scrollWidth > link.clientWidth;
  };

  return (
    <Tooltip
      label={title}
      placement="top"
      className="block w-full"
      shouldOpen={isCurrentlyTruncated}
      tooltipClassName="max-w-[min(460px,calc(100vw-16px))]"
    >
      <span ref={titleRef} className="block min-w-0 w-full">
        <LocalizedLink
          href={href ?? `/promises/${id}?from=deals`}
          title={undefined}
          className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold leading-snug text-white transition hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {title}
        </LocalizedLink>
      </span>
    </Tooltip>
  );
}

export default function PromisesClient() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = normalizeTabParam(searchParams.get("tab"));
  const tabParam = searchParams.get("tab");
  const filterParam = searchParams.get("filter");
  const statusParam = searchParams.get("status");
  const visibilityParam = searchParams.get("visibility");
  const typeParam = searchParams.get("type");
  const metricFromSearch: MetricFilter =
    filterParam === "awaiting_my_action" || filterParam === "awaiting_others"
      ? filterParam
      : "total";
  const statusFromSearch: StatusFilter = normalizeStatusParam(statusParam);
  const dealTypeFromSearch: DealTypeFilter = normalizeDealTypeParam(typeParam, visibilityParam);

  const dealMetaLabels = useMemo(
    () => ({
      created: (date: string) => t("deal.meta.created", { date }),
      due: (date: string) => t("deal.meta.due", { date }),
      closed: (date: string) => t("deal.meta.closed", { date }),
    }),
    [t]
  );

  const promiseLabels = useMemo(() => getPromiseLabels(t), [t]);

  useEffect(() => {
    if (tabParam !== "watching") return;
    router.replace(localizePath("/watching", locale));
  }, [locale, router, tabParam]);

  const statusLabelForRole = (
    status: PromiseStatus,
    role: PromiseRole,
    uiStatus: PromiseUiStatus
  ) => {
    if (uiStatus === "awaiting_acceptance") return t("promises.status.awaitingInviteAcceptance");
    if (uiStatus === "declined") return t("promises.inviteStatus.declined");
    if (uiStatus === "expired") return t("promises.inviteStatus.expired");
    if (uiStatus === "cancelled_by_creator") return t("promises.inviteStatus.cancelled_by_creator");

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

  const statusPillFor = (
    status: PromiseStatus,
    uiStatus: PromiseUiStatus
  ): { tone: StatusPillTone; icon: "check" | "clock" | "warning" } => {
    if (status === "confirmed") return { tone: "success", icon: "check" };
    if (status === "disputed" || uiStatus === "declined" || uiStatus === "cancelled_by_creator") return { tone: "danger", icon: "warning" };
    if (status === "completed_by_promisor" || uiStatus === "expired") {
      return { tone: "attention", icon: "warning" };
    }
    return { tone: "neutral", icon: "clock" };
  };

  const [summaryRows, setSummaryRows] = useState<PromiseSummary[]>([]);
  const [listRowsByTab, setListRowsByTab] = useState<Record<PagedTabKey, PromiseWithRole[]>>({
    "i-promised": [],
    "promised-to-me": [],
    "all": [],
  });
  const [pageByTab, setPageByTab] = useState<Record<PagedTabKey, number>>({
    "i-promised": 0,
    "promised-to-me": 0,
    "all": 0,
  });
  const [hasMoreByTab, setHasMoreByTab] = useState<Record<PagedTabKey, boolean>>({
    "i-promised": true,
    "promised-to-me": true,
    "all": true,
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
  const [activeMetricFilter, setActiveMetricFilter] = useState<MetricFilter>(metricFromSearch);
  const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilter>(statusFromSearch);
  const [activeDealTypeFilter, setActiveDealTypeFilter] =
    useState<DealTypeFilter>(dealTypeFromSearch);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const lastFilterRef = useRef<MetricFilter | null>(null);
  const autoSwitchHandledForFilterRef = useRef(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const statusButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isDealTypeMenuOpen, setIsDealTypeMenuOpen] = useState(false);
  const dealTypeMenuRef = useRef<HTMLDivElement | null>(null);
  const dealTypeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const supabaseErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Authentication is unavailable in this preview.";

  const reminderErrorMessage = (errorCode?: string, detail?: string) => {
    if (errorCode === "reminder_rate_limit") return t("promises.list.reminder.rateLimited");
    if (errorCode === "reminder_forbidden") return t("promises.list.reminder.forbidden");
    if (errorCode === "reminder_feature_unavailable") return t("promises.list.reminder.unavailable");
    if (errorCode === "reminder_acceptance_required") return t("promises.list.reminder.acceptedOnly");
    if (errorCode === "reminder_invalid_state") return t("promises.list.reminder.invalidState");
    if (errorCode === "reminder_participants_invalid") return t("promises.list.reminder.participantsInvalid");
    if (errorCode === "reminder_create_failed") {
      return t("promises.list.reminder.createFailed", { detail: detail ?? "unknown" });
    }
    if (errorCode === "reminder_notification_failed") {
      return t("promises.list.reminder.notificationFailed", { detail: detail ?? "unknown" });
    }
    if (errorCode === "reminder_unexpected") {
      return t("promises.list.reminder.unexpected", { detail: detail ?? "unknown" });
    }
    return t("promises.list.reminder.sendFailed");
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);
      setSummaryLoaded(false);

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
        window.location.href = localizeLoginPath(localizePath("/promises", locale), locale);
        return;
      }

      const user = session.user;
      setUserId(user.id);

      const { data, error } = await supabase
      .from("promises")
      .select(
        "id,title,is_important,status,due_at,created_at,completed_at,confirmed_at,disputed_at,condition_text,condition_met_at,counterparty_accepted_at,invite_status,invited_at,accepted_at,declined_at,ignored_at,expires_at,cancelled_at,creator_id,promisor_id,promisee_id,counterparty_id"
        + ",visibility,collective_agreement_id"
      )
      .or(buildBaseFilter(user.id))
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

      if (cancelled) return;

      if (error) setError(error.message);
      else {
        const filtered: PromiseSummary[] = [];
        for (const row of data ?? []) {
          if (!isPromiseRoleBase(row)) continue;
          filtered.push(withRole(row, user.id));
        }

        setSummaryRows(filtered);
      }

      setSummaryLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setTab = (next: TabKey) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", next);
    router.push(localizePath(`/promises?${sp.toString()}`, locale));
  };

  const fetchTabPage = async ({
    tabKey,
    page,
    replace,
  }: {
    tabKey: PagedTabKey;
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
        : tabKey === "promised-to-me"
        ? buildCounterpartyFilter(userId)
        : buildBaseFilter(userId); // "all" tab

    const baseQuery = supabase
      .from("promises")
      .select(
        "id,title,is_important,status,due_at,created_at,completed_at,confirmed_at,disputed_at,condition_text,condition_met_at,counterparty_id,counterparty_accepted_at,invite_status,invited_at,accepted_at,declined_at,ignored_at,expires_at,cancelled_at,creator_id,promisor_id,promisee_id"
        + ",visibility,collective_agreement_id"
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, rangeEnd);

    const { data, error } = await baseQuery.or(roleFilter);

    if (error) {
      setError(error.message);
      return;
    }

    const parsed: PromiseWithRole[] = [];
    for (const row of data ?? []) {
      if (!isPromiseRow(row)) continue;
      parsed.push(withRole(row, userId));
    }
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
      const pagedTab = tab as PagedTabKey;
      setHasMoreByTab((prev) => ({ ...prev, [pagedTab]: true }));
      setPageByTab((prev) => ({ ...prev, [pagedTab]: 0 }));
      setListRowsByTab((prev) => ({ ...prev, [pagedTab]: [] }));
      await fetchTabPage({ tabKey: pagedTab, page: 0, replace: true });
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
    if (!isStatusMenuOpen && !isDealTypeMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inStatusMenu =
        statusMenuRef.current?.contains(target) || statusButtonRef.current?.contains(target);
      const inDealTypeMenu =
        dealTypeMenuRef.current?.contains(target) || dealTypeButtonRef.current?.contains(target);
      if (inStatusMenu || inDealTypeMenu) return;
      setIsStatusMenuOpen(false);
      setIsDealTypeMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsStatusMenuOpen(false);
        setIsDealTypeMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isStatusMenuOpen, isDealTypeMenuOpen]);

  useEffect(() => {
    setActiveMetricFilter(metricFromSearch);
  }, [metricFromSearch]);

  useEffect(() => {
    setActiveStatusFilter(statusFromSearch);
  }, [statusFromSearch]);
  useEffect(() => {
    setActiveDealTypeFilter(dealTypeFromSearch);
  }, [dealTypeFromSearch]);

  useEffect(() => {
    if (listLoading) return;
    const summaryForTab = applyMetricFilter(summaryRows).filter((row) =>
      tab === "all" ? true : tab === "i-promised" ? row.role === "promisor" : row.role === "counterparty"
    );
    const hasAnyActiveFilter =
      activeMetricFilter !== "total" ||
      activeStatusFilter !== STATUS_FILTER_ALL ||
      activeDealTypeFilter !== DEAL_TYPE_FILTER_ALL;
    const filteredRows = hasAnyActiveFilter
      ? applyStatusFilter(summaryForTab)
      : applyListFilters(listRowsByTab[tab] ?? []);
    void loadReminderInfo(filteredRows.map((row) => row.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMetricFilter, activeStatusFilter, activeDealTypeFilter, searchQuery, listLoading, listRowsByTab, summaryRows, tab]);

  const handleSendReminder = async (promiseId: string) => {
    setError(null);
    setSendingReminderId(promiseId);
    try {
      const supabase = requireSupabase();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push(localizeLoginPath(localizePath("/promises", locale), locale));
        return;
      }

      const res = await fetch(`/api/promises/${promiseId}/reminder`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      const body = await res.json().catch(() => ({})) as {
        error?: string;
        error_code?: string;
        detail?: string | null;
        count?: number;
        created_at?: string;
      };
      if (!res.ok) {
        throw new Error(reminderErrorMessage(body.error_code, body.detail ?? undefined));
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
    let filtered = rows;

    if (activeMetricFilter === "awaiting_my_action") {
      filtered = filtered.filter((row) => isAwaitingYourAction(row));
    }
    if (activeMetricFilter === "awaiting_others") {
      filtered = filtered.filter((row) => isAwaitingOthers(row));
    }

    return filtered;
  };

  const isOverdueRow = <T extends PromiseSummary | PromiseWithRole>(row: T) => {
    if (row.uiStatus !== "active") return false;
    if (!row.due_at) return false;
    return new Date(row.due_at).getTime() < Date.now();
  };

  const matchesStatusFilter = <T extends PromiseSummary | PromiseWithRole>(
    row: T,
    status: StatusFilter
  ) => {
    if (status === STATUS_FILTER_ALL) return true;
    if (status === STATUS_FILTER_OVERDUE) return isOverdueRow(row);

    const uiStatus = fromUiStatusFilterValue(status);
    if (!uiStatus) return false;
    return row.uiStatus === uiStatus;
  };

  const applyStatusFilter = <T extends PromiseSummary | PromiseWithRole>(rows: T[]): T[] => {

    let filtered = rows;

    if (activeStatusFilter !== STATUS_FILTER_ALL) {
      filtered = filtered.filter((row) => matchesStatusFilter(row, activeStatusFilter));
    }

    return filtered;
  };

  const applyDealTypeFilter = <T extends PromiseSummary | PromiseWithRole>(rows: T[]): T[] => {
    if (activeDealTypeFilter === DEAL_TYPE_FILTER_ALL) return rows;
    if (activeDealTypeFilter === "reputation_stake") {
      return rows.filter((row) => row.is_important);
    }
    return rows.filter((row) => (row.visibility ?? "private") === activeDealTypeFilter);
  };

  const applySearchFilter = <T extends PromiseSummary | PromiseWithRole>(rows: T[]): T[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.title.toLowerCase().includes(q));
  };

  const applyListFilters = <T extends PromiseSummary | PromiseWithRole>(
    rows: T[]
  ): T[] => applySearchFilter(applyDealTypeFilter(applyStatusFilter(applyMetricFilter(rows))));

  const filteredSummaryRows = useMemo(
    () => applySearchFilter(applyDealTypeFilter(applyMetricFilter(summaryRows))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [summaryRows, activeMetricFilter, activeDealTypeFilter, searchQuery]
  );

  // For the creator of a collective agreement, every invited participant gets their
  // own promise row (all with the same collective_agreement_id, role "counterparty").
  // Count those as a single entry so totals/tabs reflect "1 agreement", not N invites.
  const dedupeCollectiveForCount = <
    T extends { collective_agreement_id: string | null; creator_id: string; role: PromiseRole }
  >(
    rowsIn: T[]
  ): T[] => {
    if (!userId || !productFlags.collectiveAgreements) return rowsIn;
    const seen = new Set<string>();
    return rowsIn.filter((row) => {
      if (row.collective_agreement_id && row.creator_id === userId && row.role === "counterparty") {
        if (seen.has(row.collective_agreement_id)) return false;
        seen.add(row.collective_agreement_id);
      }
      return true;
    });
  };

  const roleCounts = useMemo(
    () =>
      dedupeCollectiveForCount(filteredSummaryRows).reduce(
        (acc, row) => {
          if (row.role === "promisor") acc.promisor += 1;
          else if (row.role === "counterparty") acc.counterparty += 1;
          else acc.uncategorized.push(row.id);
          return acc;
        },
        { promisor: 0, counterparty: 0, uncategorized: [] as string[] }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredSummaryRows, userId]
  );

  const collectiveStatsByAgreementId = useMemo(() => {
    const map = new Map<string, { total: number; accepted: number }>();
    if (!userId || !productFlags.collectiveAgreements) return map;
    for (const row of summaryRows) {
      if (!row.collective_agreement_id || row.creator_id !== userId || row.role !== "counterparty") continue;
      const stats = map.get(row.collective_agreement_id) ?? { total: 0, accepted: 0 };
      stats.total += 1;
      if (isPromiseAccepted(row)) stats.accepted += 1;
      map.set(row.collective_agreement_id, stats);
    }
    return map;
  }, [summaryRows, userId]);

  const metricFilteredListRowsByTab = useMemo(
    () => ({
      "i-promised": applyMetricFilter(listRowsByTab["i-promised"]),
      "promised-to-me": applyMetricFilter(listRowsByTab["promised-to-me"]),
      "all": applyMetricFilter(listRowsByTab["all"]),
    }),
    [listRowsByTab, activeMetricFilter]
  );

  const filteredListRowsByTab = useMemo(
    () => ({
      "i-promised": applySearchFilter(applyDealTypeFilter(applyStatusFilter(metricFilteredListRowsByTab["i-promised"]))),
      "promised-to-me": applySearchFilter(applyDealTypeFilter(applyStatusFilter(metricFilteredListRowsByTab["promised-to-me"]))),
      "all": applySearchFilter(applyDealTypeFilter(applyStatusFilter(metricFilteredListRowsByTab["all"]))),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metricFilteredListRowsByTab, activeStatusFilter, activeDealTypeFilter, searchQuery]
  );

  const countMeExecutor = roleCounts.promisor;
  const countOtherExecutor = roleCounts.counterparty;
  const hasStatusFilter = activeStatusFilter !== STATUS_FILTER_ALL;
  const hasDealTypeFilter = activeDealTypeFilter !== DEAL_TYPE_FILTER_ALL;
  const hasSearchFilter = searchQuery.trim() !== "";
  const hasAnyFilter = activeMetricFilter !== "total" || hasStatusFilter || hasDealTypeFilter || hasSearchFilter;

  const metricSummaryRowsForCurrentTab = useMemo(
    () =>
      tab === "all"
        ? filteredSummaryRows
        : filteredSummaryRows.filter((row) =>
            tab === "i-promised" ? row.role === "promisor" : row.role === "counterparty"
          ),
    [filteredSummaryRows, tab]
  );
  const summaryRowsForCurrentTab = useMemo(
    () => applySearchFilter(applyDealTypeFilter(applyStatusFilter(metricSummaryRowsForCurrentTab))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metricSummaryRowsForCurrentTab, activeStatusFilter, activeDealTypeFilter, searchQuery]
  );
  const rows = hasAnyFilter
    ? (summaryRowsForCurrentTab as PromiseWithRole[])
    : filteredListRowsByTab[tab];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const displayRows = useMemo(() => dedupeCollectiveForCount(rows), [rows, userId]);
  const availableStatusOptions = useMemo(() => {
    const optionsMap = new Map<StatusFilter, string>();

    for (const row of metricSummaryRowsForCurrentTab) {
      const uiValue = toUiStatusFilterValue(row.uiStatus);
      if (!optionsMap.has(uiValue)) {
        optionsMap.set(uiValue, statusLabelForRole(row.status, row.role, row.uiStatus));
      }
      if (isOverdueRow(row) && !optionsMap.has(STATUS_FILTER_OVERDUE)) {
        optionsMap.set(STATUS_FILTER_OVERDUE, t("promises.list.statusFilter.options.overdue"));
      }
    }

    return [...optionsMap.entries()].map(([value, label]) => ({ value, label }));
  }, [metricSummaryRowsForCurrentTab, statusLabelForRole, t]);
  const canLoadMore = !hasAnyFilter && hasMoreByTab[tab];
  const totalPromises = summaryRows.length;
  const effectiveListLoading = listLoading;
  const isListEmpty = !effectiveListLoading && rows.length === 0;
  const isGlobalEmpty = isListEmpty && totalPromises === 0;
  const isAwaitingMyActionEmpty =
    isListEmpty && totalPromises > 0 && activeMetricFilter === "awaiting_my_action";
  const isFilteredEmpty = isListEmpty && totalPromises > 0 && !isAwaitingMyActionEmpty;
  const showAllActionWithFilters = isListEmpty && totalPromises > 0 && hasAnyFilter;
  const emptyTitle = isGlobalEmpty
    ? t("promises.empty.title")
    : isAwaitingMyActionEmpty
      ? t("promises.empty.awaitingYourActionTitle")
      : activeDealTypeFilter === "public"
        ? t("promises.empty.publicFilteredTitle")
        : activeDealTypeFilter === "private"
          ? t("promises.empty.privateFilteredTitle")
          : activeDealTypeFilter === "reputation_stake"
            ? t("promises.empty.reputationStakeFilteredTitle")
            : t("promises.empty.filteredTitle");
  const emptyDescription = isGlobalEmpty
    ? t("promises.empty.globalDescription")
    : isAwaitingMyActionEmpty
      ? t("promises.empty.awaitingYourActionDescription")
      : t("promises.empty.filteredDescription");

  const overview = useMemo(() => {
    const total = dedupeCollectiveForCount(summaryRows).length;
    const awaitingYou = summaryRows.filter((row) => isAwaitingYourAction(row)).length;
    const awaitingOthers = summaryRows.filter((row) => isAwaitingOthers(row)).length;

    return { total, awaitingYou, awaitingOthers };
  }, [summaryRows]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dreddi_awaiting_action_count", String(overview.awaitingYou));
    window.dispatchEvent(
      new CustomEvent("dreddi:awaiting-actions-updated", {
        detail: { count: overview.awaitingYou },
      })
    );
  }, [overview.awaitingYou]);

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

  useEffect(() => {
    if (!summaryLoaded) return;
    // "all" tab shows everything — no auto-switch needed
    if (tab === "all") return;

    if (lastFilterRef.current !== activeMetricFilter) {
      lastFilterRef.current = activeMetricFilter;
      autoSwitchHandledForFilterRef.current = false;
    }

    if (autoSwitchHandledForFilterRef.current) return;

    const currentCount = tab === "i-promised" ? countMeExecutor : countOtherExecutor;
    if (currentCount > 0) {
      autoSwitchHandledForFilterRef.current = true;
      return;
    }

    const fallbackTab: "i-promised" | "promised-to-me" = tab === "i-promised" ? "promised-to-me" : "i-promised";
    const fallbackCount = fallbackTab === "i-promised" ? countMeExecutor : countOtherExecutor;

    autoSwitchHandledForFilterRef.current = true;
    if (fallbackCount > 0) {
      setTab(fallbackTab);
    }
  }, [activeMetricFilter, countMeExecutor, countOtherExecutor, summaryLoaded, tab]);

  const handleMarkCompleted = async (promiseId: string) => {
    setBusyMap((m) => ({ ...m, [promiseId]: true }));
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push(localizeLoginPath(localizePath("/promises", locale), locale));
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
      setListRowsByTab((prev) => {
        const updater = (rows: PromiseWithRole[]) =>
          rows.map((row) =>
            row.id === promiseId ? { ...row, status: "completed_by_promisor" as const } : row
          );
        return {
          "i-promised": updater(prev["i-promised"]),
          "promised-to-me": updater(prev["promised-to-me"]),
          "all": updater(prev["all"]),
        };
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("promises.list.errors.updateFailed")
      );
    } finally {
      setBusyMap((m) => ({ ...m, [promiseId]: false }));
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || effectiveListLoading || !canLoadMore) return;
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
    const resolved = activeMetricFilter === next && next !== "total" ? "total" : next;
    setActiveMetricFilter(resolved);

    const sp = new URLSearchParams(searchParams.toString());
    if (resolved === "total") sp.delete("filter");
    else sp.set("filter", resolved);
    router.push(localizePath(`/promises?${sp.toString()}`, locale));
  };

  const handleStatusFilterChange = (next: StatusFilter) => {
    setActiveStatusFilter(next);
    setIsStatusMenuOpen(false);
    const sp = new URLSearchParams(searchParams.toString());
    if (next === STATUS_FILTER_ALL) sp.delete("status");
    else sp.set("status", next);
    router.push(localizePath(`/promises?${sp.toString()}`, locale));
  };
  const handleDealTypeFilterChange = (next: DealTypeFilter) => {
    setActiveDealTypeFilter(next);
    setIsDealTypeMenuOpen(false);
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("visibility");
    if (next === DEAL_TYPE_FILTER_ALL) sp.delete("type");
    else sp.set("type", next);
    router.push(localizePath(`/promises?${sp.toString()}`, locale));
  };

  useEffect(() => {
    if (activeStatusFilter === STATUS_FILTER_ALL) return;
    if (availableStatusOptions.some((option) => option.value === activeStatusFilter)) return;
    handleStatusFilterChange(STATUS_FILTER_ALL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatusFilter, availableStatusOptions]);

  const statusOptions: Array<{ value: StatusFilter; label: string }> = useMemo(() => {
    return [
      { value: STATUS_FILTER_ALL, label: t("promises.list.statusFilter.options.all") },
      ...availableStatusOptions,
    ];
  }, [availableStatusOptions, t]);
  const dealTypeOptions: Array<{ value: DealTypeFilter; label: string }> = [
    { value: "all", label: t("promises.list.dealTypeFilter.options.all") },
    { value: "public", label: t("promises.list.dealTypeFilter.options.public") },
    { value: "private", label: t("promises.list.dealTypeFilter.options.private") },
    { value: "reputation_stake", label: t("promises.list.dealTypeFilter.options.reputationStake") },
  ];
  const activeStatusLabel =
    statusOptions.find((option) => option.value === activeStatusFilter)?.label ??
    t("promises.list.statusFilter.options.all");
  const activeDealTypeLabel =
    dealTypeOptions.find((option) => option.value === activeDealTypeFilter)?.label ??
    t("promises.list.dealTypeFilter.options.all");

  return (
    <main className="relative py-10">
      {toast && (
        <div className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center sm:bottom-8">
          <div
            role="status"
            aria-live="polite"
            className="max-w-sm rounded-2xl border border-emerald-300/35 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-50 shadow-2xl shadow-black/35 backdrop-blur-md sm:max-w-md"
          >
            {toast}
          </div>
        </div>
      )}

      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(74,222,128,0.08),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(74,144,226,0.08),transparent_28%)]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-5xl space-y-5 px-4 sm:px-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-4 shadow-2xl shadow-black/40 backdrop-blur sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="text-xs uppercase tracking-[0.32em] text-emerald-200">
                {t("promises.overview.eyebrow")}
              </div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">{t("promises.overview.title")}</h1>
              <p className="text-sm text-slate-300">{t("promises.overview.subtitle")}</p>
            </div>

            <div className="hidden shrink-0 sm:block">
              <NewDealButton label={t("promises.overview.cta")} />
            </div>
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
          {/* Search — sits above tabs, full width inside the card */}
          <div className="relative mb-3">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5">
              <Search className="h-4 w-4 text-slate-400" aria-hidden />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const next = e.target.value;
                setSearchQuery(next);
                // Auto-switch to "all" tab so results from both tabs are visible
                if (next.trim() && tab !== "all") {
                  setTab("all");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchQuery("");
              }}
              placeholder={t("promises.search.placeholder")}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-9 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/40 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-slate-400 transition hover:text-white"
                aria-label={t("promises.search.clear")}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

          {/* Tab row + filter row: stacked on mobile, single row on desktop */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            {/* Tabs — full-width on mobile, auto on desktop */}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {(["all", "i-promised", "promised-to-me"] as const).map((key) => {
                const isActive = tab === key;
                const label =
                  key === "all"
                    ? t("promises.list.tabs.all", { count: roleCounts.promisor + roleCounts.counterparty })
                    : key === "i-promised"
                    ? t("promises.list.tabs.executorMe", { count: roleCounts.promisor })
                    : t("promises.list.tabs.executorOther", { count: roleCounts.counterparty });
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={[
                      "w-full rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto sm:whitespace-nowrap",
                      isActive
                        ? "cursor-default bg-white/10 text-white ring-2 ring-emerald-400/60"
                        : "cursor-pointer bg-white/5 text-white/70 ring-white/10 hover:bg-white/10 hover:text-white hover:ring-white/20",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center">
              <div className="relative" ref={dealTypeMenuRef}>
                <span className="sr-only">{t("promises.list.dealTypeFilter.label")}</span>
                <button
                  type="button"
                  ref={dealTypeButtonRef}
                  onClick={() => setIsDealTypeMenuOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={isDealTypeMenuOpen}
                  aria-label={t("promises.list.dealTypeFilter.label")}
                  className="inline-flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:min-w-[212px] sm:w-auto"
                >
                  <span className="truncate">{activeDealTypeLabel}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-300 transition-transform ${isDealTypeMenuOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                {isDealTypeMenuOpen && (
                  <div
                    role="listbox"
                    aria-label={t("promises.list.dealTypeFilter.label")}
                    className="absolute right-0 z-20 mt-2 w-full min-w-[212px] overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 p-1 shadow-xl shadow-black/50 backdrop-blur sm:w-auto"
                  >
                    {dealTypeOptions.map((option) => {
                      const selected = option.value === activeDealTypeFilter;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => handleDealTypeFilterChange(option.value)}
                          className={[
                            "flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
                            selected
                              ? "bg-emerald-400/90 text-slate-950"
                              : "text-slate-100 hover:bg-white/10",
                          ].join(" ")}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="relative" ref={statusMenuRef}>
              <span className="sr-only">{t("promises.list.statusFilter.label")}</span>
              <button
                type="button"
                ref={statusButtonRef}
                onClick={() => setIsStatusMenuOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={isStatusMenuOpen}
                aria-label={t("promises.list.statusFilter.label")}
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:min-w-[212px] sm:w-auto"
              >
                <span className="truncate">{activeStatusLabel}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-300 transition-transform ${isStatusMenuOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>

              {isStatusMenuOpen && (
                <div
                  role="listbox"
                  aria-label={t("promises.list.statusFilter.label")}
                  className="absolute right-0 z-20 mt-2 w-full min-w-[212px] overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 p-1 shadow-xl shadow-black/50 backdrop-blur sm:w-auto"
                >
                  {statusOptions.map((option) => {
                    const selected = option.value === activeStatusFilter;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => handleStatusFilterChange(option.value)}
                        className={[
                          "flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
                          selected
                            ? "bg-emerald-400/90 text-slate-950"
                            : "text-slate-100 hover:bg-white/10",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {effectiveListLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[102px] animate-pulse rounded-2xl bg-white/5" />
                ))}
              </div>
            )}

            {!effectiveListLoading &&
              displayRows.map((p) => {
                const isCollectiveCreatorEntry =
                  productFlags.collectiveAgreements &&
                  !!p.collective_agreement_id &&
                  p.creator_id === userId &&
                  p.role === "counterparty";

                if (isCollectiveCreatorEntry) {
                  const stats = collectiveStatsByAgreementId.get(p.collective_agreement_id!) ?? {
                    total: 1,
                    accepted: 0,
                  };
                  const dealMeta = formatDealMeta(p, locale, dealMetaLabels);
                  const allAccepted = stats.accepted === stats.total;

                  return (
                    <div
                      key={p.collective_agreement_id}
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-300/40 hover:bg-emerald-500/5 sm:p-5 lg:p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <DealTitleLink
                                id={p.id}
                                title={p.title}
                                href={`/promises/collective/${p.collective_agreement_id}`}
                              />
                            </div>
                          </div>
                          <div className="text-xs text-slate-400">{dealMeta}</div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 text-left text-sm text-slate-200 sm:justify-end lg:self-start">
                          <StatusPill
                            label={t("collectiveAgreements.summary.progress", {
                              total: stats.total,
                              accepted: stats.accepted,
                            })}
                            tone={allAccepted ? "success" : "neutral"}
                            icon={allAccepted ? "check" : "clock"}
                            marker="icon"
                            className="shrink-0"
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                const isPromisor = p.role === "promisor";
                const canReview = p.isReviewer;
                const acceptedBySecondSide = isPromiseAccepted(p);
                const canSendReminder = getNextActionOwner(p, userId) === "other";
                const isDeclined = p.uiStatus === "declined" || p.status === "declined";
                const isArchivedInviteStatus =
                  p.status === "declined" ||
                  p.uiStatus === "declined" ||
                  p.uiStatus === "expired" ||
                  p.uiStatus === "cancelled_by_creator";
                const reminderInfo = reminderInfoByDeal[p.id] ?? { count: 0, lastSentAt: null };
                const reminderCooldown = isReminderCoolingDown(reminderInfo.lastSentAt);
                const reminderTooltip = reminderInfo.lastSentAt
                  ? t("promises.list.reminder.tooltipWithLast", {
                      date: new Date(reminderInfo.lastSentAt).toLocaleString(locale),
                    })
                  : t("promises.list.reminder.tooltip");

                const statusLabel = statusLabelForRole(p.status, p.role, p.uiStatus);
                const statusPill = statusPillFor(p.status, p.uiStatus);

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
                    className={[
                      "group overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-300/40 hover:bg-emerald-500/5 sm:p-5 lg:p-4",
                      isArchivedInviteStatus ? "opacity-70" : "",
                    ].join(" ")}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <DealTitleLink id={p.id} title={p.title} />
                          </div>
                        </div>
                        <div className="text-xs text-slate-400">{dealMeta}</div>
                        {productFlags.collectiveAgreements && p.collective_agreement_id && (
                          <LocalizedLink
                            href={`/promises/collective/${p.collective_agreement_id}`}
                            className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-200 hover:text-emerald-100"
                          >
                            {t("collectiveAgreements.badge")}
                          </LocalizedLink>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 text-left text-sm text-slate-200 sm:justify-end lg:self-start">
                        <StatusPill
                          label={statusLabel}
                          tone={statusPill.tone}
                          icon={statusPill.icon}
                          className="shrink-0"
                        />

                        {canSendReminder && (
                          <Tooltip label={reminderTooltip} placement="top">
                            <IconButton
                              icon={<BellRing className="h-[18px] w-[18px]" />}
                              ariaLabel={t("promises.list.reminder.aria")}
                              onClick={() => handleSendReminder(p.id)}
                              disabled={sendingReminderId === p.id || reminderCooldown}
                              className="h-12 w-12"
                            />
                          </Tooltip>
                        )}

                        {isPromisor && p.status === "active" && acceptedBySecondSide && (
                          <Tooltip label={t("promises.list.markCompleted")} placement="top">
                            <IconButton
                              icon={<CheckCircle2 className="h-[18px] w-[18px]" />}
                              ariaLabel={t("promises.list.markCompleted")}
                              onClick={() => setConfirmingId(p.id)}
                              disabled={busy}
                              className="h-12 w-12"
                            />
                          </Tooltip>
                        )}

                        {canReview && p.status === "completed_by_promisor" && (
                          <Tooltip label={t("promises.list.reviewConfirm")} placement="top">
                            <IconButton
                              href={`/promises/${p.id}/confirm`}
                              icon={<BadgeCheck className="h-[18px] w-[18px]" />}
                              ariaLabel={t("promises.list.reviewConfirm")}
                              className="h-12 w-12"
                            />
                          </Tooltip>
                        )}
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
                    <LocalizedLink
                      href="/promises/new"
                      className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
                    >
                      {t("promises.empty.cta")}
                    </LocalizedLink>
                  </div>
                )}
                {isFilteredEmpty && showAllActionWithFilters && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMetricFilter("total");
                        setActiveStatusFilter("all");
                        setActiveDealTypeFilter("all");
                        setSearchQuery("");
                        const sp = new URLSearchParams(searchParams.toString());
                        sp.delete("filter");
                        sp.delete("status");
                        sp.delete("visibility");
                        sp.delete("type");
                        router.push(localizePath(`/promises?${sp.toString()}`, locale));
                      }}
                      className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
                    >
                      {t("promises.empty.showAll")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!effectiveListLoading && rows.length > 0 && canLoadMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white/5 sm:w-auto"
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
              {t("promises.confirmModal.body", { entityLower: promiseLabels.entityLower })}
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { PromiseRole } from "@/lib/promiseActions";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import { getPromiseUiStatus, PromiseUiStatus } from "@/lib/promiseUiStatus";
import { StatusPill, StatusPillTone } from "@/app/components/ui/StatusPill";
import { formatDealMeta } from "@/lib/formatDealMeta";
import { localizePath } from "@/lib/i18n/routing";
import { ChevronDown, EllipsisVertical } from "lucide-react";
import { notifyGroupsChanged } from "@/lib/groupsEvents";

type DealRow = {
  id: string;
  title: string;
  status: PromiseStatus;
  due_at: string | null;
  created_at: string;
  creator_id: string;
  promisor_id: string | null;
  promisee_id: string | null;
  counterparty_id: string | null;
  invite_status: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  ignored_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
};

type GroupRow = { id: string; title: string; description: string | null };
type AttachableDealRow = { id: string; title: string };

type RowWithUi = DealRow & {
  role: PromiseRole;
  uiStatus: PromiseUiStatus;
};

const PAGE_SIZE = 6;

const statusPillFor = (
  status: PromiseStatus,
  uiStatus: PromiseUiStatus
): { tone: StatusPillTone; icon: "check" | "clock" | "warning" } => {
  if (status === "confirmed") return { tone: "success", icon: "check" };
  if (status === "disputed" || uiStatus === "declined" || uiStatus === "cancelled_by_creator") {
    return { tone: "danger", icon: "warning" };
  }
  if (status === "completed_by_promisor" || uiStatus === "expired") {
    return { tone: "attention", icon: "warning" };
  }
  return { tone: "neutral", icon: "clock" };
};

export default function PromiseGroupDetailPage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const groupId = params?.id;
  const [group, setGroup] = useState<GroupRow | null>(null);
  const [rows, setRows] = useState<RowWithUi[]>([]);
  const [attachableDeals, setAttachableDeals] = useState<AttachableDealRow[]>([]);
  const [selectedAttachDealId, setSelectedAttachDealId] = useState("");
  const [attachDealQuery, setAttachDealQuery] = useState("");
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [unlinkingDealId, setUnlinkingDealId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [openDealActionsId, setOpenDealActionsId] = useState<string | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);
  const attachButtonRef = useRef<HTMLButtonElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const actionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const dealActionsMenuRef = useRef<HTMLDivElement | null>(null);
  const dealActionsButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!groupId) return;
    let active = true;

    const load = async () => {
      setError(null);
      let supabase;
      try {
        supabase = requireSupabase();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Authentication is unavailable.");
          setLoading(false);
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: groupData, error: groupError } = await supabase
        .from("promise_groups")
        .select("id,title,description")
        .eq("id", groupId)
        .eq("owner_user_id", session.user.id)
        .maybeSingle();

      if (!active) return;
      if (groupError || !groupData) {
        setError(groupError?.message ?? t("groups.errors.notFound"));
        setLoading(false);
        return;
      }
      setGroup(groupData as GroupRow);

      const { data: dealRows, error: dealError } = await supabase
        .from("promises")
        .select(
          "id,title,status,due_at,created_at,creator_id,promisor_id,promisee_id,counterparty_id,invite_status,invited_at,accepted_at,declined_at,ignored_at,expires_at,cancelled_at"
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (dealError) {
        setError(dealError.message);
      } else {
        const normalized: RowWithUi[] = (dealRows ?? [])
          .filter((row) => isPromiseStatus((row as { status?: unknown }).status))
          .map((row) => {
            const typed = row as DealRow;
            const role: PromiseRole =
              resolveExecutorId(typed) === session.user.id ? "promisor" : "counterparty";
            return {
              ...typed,
              role,
              uiStatus: getPromiseUiStatus(typed),
            };
          });
        setRows(normalized);
      }

      const { data: candidateRows, error: candidateError } = await supabase
        .from("promises")
        .select("id,title")
        .or(`group_id.is.null,group_id.neq.${groupId}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!active) return;
      if (!candidateError) {
        setAttachableDeals((candidateRows ?? []) as AttachableDealRow[]);
        setSelectedAttachDealId((candidateRows?.[0]?.id as string | undefined) ?? "");
        setAttachDealQuery("");
      }

      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [groupId, reloadTick, t]);

  const attachDealToGroup = async () => {
    if (!groupId || !selectedAttachDealId) return;
    setAttaching(true);
    setError(null);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setAttaching(false);
      setError(err instanceof Error ? err.message : "Authentication is unavailable.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setAttaching(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("promises")
      .update({ group_id: groupId })
      .eq("id", selectedAttachDealId);

    setAttaching(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setReloadTick((prev) => prev + 1);
  };

  const filteredAttachableDeals = useMemo(() => {
    const query = attachDealQuery.trim().toLowerCase();
    if (!query) return attachableDeals;
    return attachableDeals.filter((deal) => deal.title.toLowerCase().includes(query));
  }, [attachDealQuery, attachableDeals]);

  const activeAttachDealTitle = useMemo(
    () => attachableDeals.find((deal) => deal.id === selectedAttachDealId)?.title ?? "",
    [attachableDeals, selectedAttachDealId]
  );

  useEffect(() => {
    if (!isAttachMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!attachMenuRef.current?.contains(target) && !attachButtonRef.current?.contains(target)) {
        setIsAttachMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAttachMenuOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isAttachMenuOpen]);

  useEffect(() => {
    if (!isActionsMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!actionsMenuRef.current?.contains(target) && !actionsButtonRef.current?.contains(target)) {
        setIsActionsMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsActionsMenuOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isActionsMenuOpen]);

  useEffect(() => {
    if (!openDealActionsId) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!dealActionsMenuRef.current?.contains(target) && !dealActionsButtonRef.current?.contains(target)) {
        setOpenDealActionsId(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDealActionsId(null);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openDealActionsId]);

  const deleteGroup = async () => {
    if (!groupId || !group) return;

    setDeletingGroup(true);
    setError(null);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setDeletingGroup(false);
      setError(err instanceof Error ? err.message : "Authentication is unavailable.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setDeletingGroup(false);
      return;
    }

    const { error: unlinkError } = await supabase
      .from("promises")
      .update({ group_id: null })
      .eq("group_id", groupId);

    if (unlinkError) {
      setDeletingGroup(false);
      setError(unlinkError.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from("promise_groups")
      .delete()
      .eq("id", groupId)
      .eq("owner_user_id", session.user.id);

    setDeletingGroup(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setShowDeleteConfirm(false);
    setIsActionsMenuOpen(false);
    notifyGroupsChanged();
    router.push(localizePath("/promises/groups", locale));
  };

  const unlinkDealFromGroup = async (dealId: string) => {
    if (!groupId) return;
    setUnlinkingDealId(dealId);
    setError(null);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setUnlinkingDealId(null);
      setError(err instanceof Error ? err.message : "Authentication is unavailable.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setUnlinkingDealId(null);
      return;
    }

    const { error: unlinkError } = await supabase
      .from("promises")
      .update({ group_id: null })
      .eq("id", dealId)
      .eq("group_id", groupId);

    setUnlinkingDealId(null);

    if (unlinkError) {
      setError(unlinkError.message);
      return;
    }

    setReloadTick((prev) => prev + 1);
  };

  const summary = useMemo(() => {
    const counts = {
      awaiting_acceptance: 0,
      active: 0,
      completed_by_promisor: 0,
      confirmed: 0,
      disputed: 0,
    };

    for (const row of rows) {
      if (row.uiStatus === "awaiting_acceptance") counts.awaiting_acceptance += 1;
      else if (row.status in counts) {
        counts[row.status as "active" | "completed_by_promisor" | "confirmed" | "disputed"] += 1;
      }
    }

    return counts;
  }, [rows]);
  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);
  const canLoadMore = rows.length > visibleCount;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setLoadingMore(false);
  }, [rows]);

  const statusLabel = (row: RowWithUi) => {
    if (row.uiStatus === "awaiting_acceptance") return t("promises.status.awaitingInviteAcceptance");
    if (row.uiStatus === "declined") return t("promises.inviteStatus.declined");
    if (row.uiStatus === "expired") return t("promises.inviteStatus.expired");
    if (row.uiStatus === "cancelled_by_creator") return t("promises.inviteStatus.cancelled_by_creator");

    if (row.role === "promisor") {
      if (row.status === "active") return t("promises.status.active");
      if (row.status === "completed_by_promisor") return t("promises.status.pendingConfirmation");
      if (row.status === "confirmed") return t("promises.status.confirmed");
      if (row.status === "disputed") return t("promises.status.disputed");
    }

    if (row.status === "active") return t("promises.status.pendingCompletion");
    if (row.status === "completed_by_promisor") return t("promises.status.needsReview");
    if (row.status === "confirmed") return t("promises.status.confirmed");
    if (row.status === "disputed") return t("promises.status.disputed");
    return row.status;
  };

  const handleLoadMore = () => {
    if (!canLoadMore || loadingMore) return;
    setLoadingMore(true);
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, rows.length));
    setLoadingMore(false);
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <LocalizedLink href="/promises/groups" className="text-sm text-emerald-200 hover:text-emerald-100">
        ← {t("groups.back")}
      </LocalizedLink>
      {loading ? (
        <p className="mt-6 text-sm text-slate-400">{t("groups.loading")}</p>
      ) : error || !group ? (
        <p className="mt-6 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error ?? t("groups.errors.notFound")}
        </p>
      ) : (
        <>
          <header className="relative mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-slate-300">{t("groups.detailEyebrow")}</p>
            <div className="mt-2 pr-14">
              <h1 className="text-3xl font-semibold text-white">{group.title}</h1>
              <div className="absolute right-5 top-5 z-10">
                <button
                  type="button"
                  ref={actionsButtonRef}
                  onClick={() => setIsActionsMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={isActionsMenuOpen}
                  aria-label={t("groups.actions.menu")}
                  className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  <EllipsisVertical className="h-5 w-5" aria-hidden />
                </button>

                {isActionsMenuOpen && (
                  <div
                    ref={actionsMenuRef}
                    role="menu"
                    className="absolute right-0 z-20 mt-2 w-max overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 p-2 shadow-xl shadow-black/50 backdrop-blur"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowDeleteConfirm(true);
                        setIsActionsMenuOpen(false);
                      }}
                      disabled={deletingGroup}
                      className="flex h-9 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg px-4 text-center text-sm font-semibold leading-none text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingGroup ? t("groups.delete.deleting") : t("groups.delete.action")}
                    </button>
                  </div>
                )}
              </div>
            </div>
            {group.description && <p className="mt-2 text-sm text-slate-300">{group.description}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/15 px-3 py-1">
                {t("groups.summary.total", { count: rows.length })}
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1">
                {t("groups.summary.awaitingAcceptance", { count: summary.awaiting_acceptance })}
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1">
                {t("groups.summary.active", { count: summary.active })}
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1">
                {t("groups.summary.awaitingReview", { count: summary.completed_by_promisor })}
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1">
                {t("groups.summary.confirmed", { count: summary.confirmed })}
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1">
                {t("groups.summary.disputed", { count: summary.disputed })}
              </span>
            </div>
          </header>

          <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white">{t("groups.attachExisting.title")}</h2>
            <p className="mt-1 text-xs text-slate-400">{t("groups.attachExisting.hint")}</p>
            {attachableDeals.length === 0 ? (
              <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                {t("groups.attachExisting.empty")}
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:max-w-xl">
                  <button
                    type="button"
                    ref={attachButtonRef}
                    onClick={() => setIsAttachMenuOpen((open) => !open)}
                    aria-haspopup="listbox"
                    aria-expanded={isAttachMenuOpen}
                    className="inline-flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-sm font-medium text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    <span className="truncate">
                      {activeAttachDealTitle || t("groups.attachExisting.selectPlaceholder")}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-300 transition-transform ${isAttachMenuOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>

                  {isAttachMenuOpen && (
                    <div
                      ref={attachMenuRef}
                      role="listbox"
                      className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 p-2 shadow-xl shadow-black/50 backdrop-blur"
                    >
                      <input
                        type="text"
                        value={attachDealQuery}
                        onChange={(event) => setAttachDealQuery(event.target.value)}
                        placeholder={t("groups.attachExisting.searchPlaceholder")}
                        className="mb-2 h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-emerald-300/60"
                      />
                      <div className="max-h-56 overflow-y-auto">
                        {filteredAttachableDeals.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-400">
                            {t("groups.attachExisting.noMatches")}
                          </div>
                        ) : (
                          filteredAttachableDeals.map((deal) => {
                            const selected = selectedAttachDealId === deal.id;
                            return (
                              <button
                                key={deal.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setSelectedAttachDealId(deal.id);
                                  setIsAttachMenuOpen(false);
                                }}
                                className={[
                                  "flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
                                  selected ? "bg-emerald-400/90 text-slate-950" : "text-slate-100 hover:bg-white/10",
                                ].join(" ")}
                              >
                                <span className="truncate">{deal.title}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void attachDealToGroup()}
                  disabled={attaching || !selectedAttachDealId}
                  className="flex h-10 w-full cursor-pointer items-center justify-center rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {attaching ? t("groups.attachExisting.attaching") : t("groups.attachExisting.submit")}
                </button>
              </div>
            )}
          </section>

          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold text-white">{t("groups.dealsTitle")}</h2>
            {rows.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                {t("groups.dealsEmpty")}
              </p>
            ) : (
              <ul className="space-y-2">
                {visibleRows.map((row) => {
                  const pill = statusPillFor(row.status, row.uiStatus);
                  return (
                    <li key={row.id}>
                      <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-emerald-300/40 hover:bg-white/5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <LocalizedLink
                            href={`/promises/${row.id}?from=group&groupId=${groupId}`}
                            className="min-w-0 flex-1"
                          >
                            <p className="truncate font-semibold text-white">{row.title}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {row.role === "promisor" ? t("groups.dealLine.iAmResponsible") : t("groups.dealLine.otherResponsible")}
                              {" • "}
                              {formatDealMeta({
                                status: row.status,
                                due_at: row.due_at,
                                created_at: row.created_at,
                                declined_at: row.declined_at,
                              }, locale, {
                                created: (date) => t("deal.meta.created", { date }),
                                due: (date) => t("deal.meta.due", { date }),
                                closed: (date) => t("deal.meta.closed", { date }),
                              })}
                            </p>
                          </LocalizedLink>
                          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:shrink-0 sm:self-start sm:justify-end">
                            <StatusPill tone={pill.tone} icon={pill.icon} label={statusLabel(row)} />
                            <div className="relative">
                              <button
                                type="button"
                                ref={openDealActionsId === row.id ? dealActionsButtonRef : undefined}
                                onClick={() => setOpenDealActionsId((prev) => (prev === row.id ? null : row.id))}
                                aria-haspopup="menu"
                                aria-expanded={openDealActionsId === row.id}
                                aria-label={t("groups.deals.menu")}
                                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 transition hover:border-emerald-300/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                              >
                                <EllipsisVertical className="h-4 w-4" aria-hidden />
                              </button>
                              {openDealActionsId === row.id && (
                                <div
                                  ref={dealActionsMenuRef}
                                  role="menu"
                                  className="absolute right-0 z-20 mt-2 w-max overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 p-2 shadow-xl shadow-black/50 backdrop-blur"
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenDealActionsId(null);
                                      void unlinkDealFromGroup(row.id);
                                    }}
                                    disabled={unlinkingDealId === row.id}
                                    className="flex h-9 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg px-4 text-center text-sm font-medium leading-none text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {unlinkingDealId === row.id ? t("groups.deals.unlinking") : t("groups.deals.unlink")}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {rows.length > 0 && canLoadMore && (
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
          </section>
        </>
      )}

      {showDeleteConfirm && group && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label={t("groups.delete.cancel")}
            className="absolute inset-0"
            onClick={() => !deletingGroup && setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0f1a] p-6 shadow-2xl shadow-black/60">
            <h3 className="text-xl font-semibold text-white">{t("groups.delete.action")}</h3>
            <p className="mt-3 text-sm text-neutral-200">{t("groups.delete.confirm", { title: group.title })}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingGroup}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("groups.delete.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void deleteGroup()}
                disabled={deletingGroup}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingGroup ? t("groups.delete.deleting") : t("groups.delete.confirmAction")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { requireSupabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n/I18nProvider";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { PromiseRole } from "@/lib/promiseActions";
import { resolveExecutorId } from "@/lib/promiseParticipants";
import { getPromiseInviteStatus } from "@/lib/promiseAcceptance";
import { getPromiseUiStatus, PromiseUiStatus } from "@/lib/promiseUiStatus";
import { StatusPill, StatusPillTone } from "@/app/components/ui/StatusPill";
import { formatDealMeta } from "@/lib/formatDealMeta";

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

type RowWithUi = DealRow & {
  role: PromiseRole;
  uiStatus: PromiseUiStatus;
};

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
  const params = useParams<{ id: string }>();
  const groupId = params?.id;
  const [group, setGroup] = useState<GroupRow | null>(null);
  const [rows, setRows] = useState<RowWithUi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        .eq("creator_id", session.user.id)
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
              uiStatus: getPromiseUiStatus({
                ...typed,
                inviteStatus: getPromiseInviteStatus(typed),
                isReviewer: role !== "promisor",
              }),
            };
          });
        setRows(normalized);
      }

      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [groupId, t]);

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
          <header className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">{t("groups.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{group.title}</h1>
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

          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold text-white">{t("groups.dealsTitle")}</h2>
            {rows.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                {t("groups.dealsEmpty")}
              </p>
            ) : (
              <ul className="space-y-2">
                {rows.map((row) => {
                  const pill = statusPillFor(row.status, row.uiStatus);
                  return (
                    <li key={row.id}>
                      <LocalizedLink
                        href={`/promises/${row.id}`}
                        className="block rounded-xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-emerald-300/40 hover:bg-white/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{row.title}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {row.role === "promisor" ? t("groups.dealLine.iAmResponsible") : t("groups.dealLine.otherResponsible")}
                              {" • "}
                              {formatDealMeta({
                                dueAt: row.due_at,
                                createdAt: row.created_at,
                                labels: {
                                  created: (date) => t("deal.meta.created", { date }),
                                  due: (date) => t("deal.meta.due", { date }),
                                  closed: (date) => t("deal.meta.closed", { date }),
                                },
                              })}
                            </p>
                          </div>
                          <StatusPill tone={pill.tone} icon={pill.icon} label={statusLabel(row)} />
                        </div>
                      </LocalizedLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";
import { formatDueDate } from "@/lib/formatDueDate";
import { stripTrailingPeriod } from "@/lib/text";
import {
  getPromiseInviteStatus,
  isPromiseAccepted,
  InviteStatus,
} from "@/lib/promiseAcceptance";
import { getPromiseUiStatus, PromiseUiStatus } from "@/lib/promiseUiStatus";

type PromiseRow = {
  id: string;
  title: string;
  details: string | null;
  condition_text: string | null;
  condition_met_at: string | null;
  condition_met_by: string | null;
  counterparty_contact: string | null;
  due_at: string | null;
  status: PromiseStatus;
  created_at: string;

  invite_token: string | null;
  counterparty_id: string | null;
  counterparty_accepted_at: string | null;
  invite_status: InviteStatus | null;
  invited_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  ignored_at: string | null;
  creator_id: string;
  promisor_id: string | null;
  promisee_id: string | null;
  visibility: "private" | "public";
};

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold text-neutral-200">{title}</div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatusPill({ status }: { status: PromiseUiStatus }) {
  const t = useT();
  const labelMap: Record<PromiseUiStatus, string> = {
    active: t("promises.status.active"),
    completed_by_promisor: t("promises.status.pendingConfirmation"),
    confirmed: t("promises.status.confirmed"),
    disputed: t("promises.status.disputed"),
    awaiting_acceptance: t("promises.status.awaitingInviteAcceptance"),
    declined: t("promises.inviteStatus.declined"),
    ignored: t("promises.inviteStatus.ignored"),
  };

  const colorMap: Record<PromiseUiStatus, string> = {
    active: "border-neutral-700 text-neutral-200 bg-white/0",
    confirmed: "border-emerald-700/60 text-emerald-200 bg-emerald-500/10",
    disputed: "border-red-700/60 text-red-200 bg-red-500/10",
    completed_by_promisor: "border-amber-500/40 text-amber-100 bg-amber-500/10",
    awaiting_acceptance: "border-slate-700/60 text-slate-200 bg-slate-500/10",
    declined: "border-red-700/60 text-red-200 bg-red-500/10",
    ignored: "border-amber-500/40 text-amber-100 bg-amber-500/10",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${colorMap[status] ?? "border-neutral-700 bg-white/0 text-white"}`}
    >
      {labelMap[status] ?? status}
    </span>
  );
}

function ActionButton({
  label,
  variant,
  active,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  variant: "primary" | "ghost" | "ok" | "danger";
  active?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium " +
    "transition select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 " +
    "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:shadow-none";

  const ghost =
    "border-neutral-800 bg-transparent text-neutral-200 hover:bg-white/5 hover:border-neutral-700";

  const primary =
    "border-white/10 bg-white text-neutral-950 hover:bg-white/90 hover:border-white/20";

  // мягкая активная подсветка (не “белая заливка на весь экран”)
  const activeNeutral =
    "border-white/20 bg-white/10 text-white hover:bg-white/14 hover:border-white/25";
  const activeOk =
    "border-emerald-500/35 bg-emerald-500/12 text-emerald-100 hover:bg-emerald-500/16";
  const activeDanger =
    "border-red-500/35 bg-red-500/12 text-red-100 hover:bg-red-500/16";

  const toneOk =
    "border-emerald-500/20 bg-transparent text-emerald-200 hover:bg-emerald-500/10 hover:border-emerald-500/30";
  const toneDanger =
    "border-red-500/20 bg-transparent text-red-200 hover:bg-red-500/10 hover:border-red-500/30";

  let cls = base;

  if (variant === "primary") cls += " " + primary;
  else if (variant === "ghost") cls += " " + ghost;
  else if (variant === "ok") cls += " " + (active ? activeOk : toneOk);
  else if (variant === "danger") cls += " " + (active ? activeDanger : toneDanger);

  // “active” только для нейтрального (Active status) + для ok/danger уже учтено
  if (active && (variant === "ghost" || variant === "primary")) {
    cls += " " + activeNeutral;
  }

  const t = useT();

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cls}>
      {loading ? t("promises.detail.saving") : label}
    </button>
  );
}

export default function PromisePage() {
  const t = useT();
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id;
  const backFrom = searchParams?.get("from");

  const [p, setP] = useState<PromiseRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counterpartyDisplayName, setCounterpartyDisplayName] = useState<string | null>(null);

  // отдельные "busy" чтобы не ломать UX всего экрана
  const [actionBusy, setActionBusy] = useState<"complete" | "confirm" | "dispute" | null>(null);
  const [conditionBusy, setConditionBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState<"generate" | "regen" | "copy" | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const supabaseErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : "Authentication is unavailable in this preview.";

  const dueText = useMemo(() => {
    if (!p?.due_at) return t("promises.detail.noDeadline");
    return (
      formatDueDate(p.due_at, locale, { includeYear: true, includeTime: true }) ??
      t("promises.detail.noDeadline")
    );
  }, [locale, p, t]);

  const backLink = useMemo(() => {
    if (backFrom === "dashboard") {
      return { href: "/", label: "← Back to dashboard" };
    }
    return { href: "/promises", label: "← Back to deals" };
  }, [backFrom]);

  async function requireSessionOrRedirect(
    nextPath: string,
    supabase: ReturnType<typeof requireSupabase>
  ) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return null;
    }
    setUserId(data.session.user.id);
    return data.session;
  }

  async function load() {
    if (!id) return;

    setError(null);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setError(supabaseErrorMessage(err));
      return;
    }

    const session = await requireSessionOrRedirect(`/promises/${id}`, supabase);
    if (!session) return;

    const { data, error } = await supabase
      .from("promises")
      .select(
        "id,title,details,condition_text,condition_met_at,condition_met_by,counterparty_contact,due_at,status,created_at,invite_token,counterparty_id,counterparty_accepted_at,invite_status,invited_at,accepted_at,declined_at,ignored_at,creator_id,promisor_id,promisee_id,visibility"
      )
      .eq("id", id)
      .single();

    if (error) setError(error.message);
    else {
      const status = (data as { status?: unknown }).status;
      if (!isPromiseStatus(status)) {
        setError(t("promises.detail.errors.unsupportedStatus"));
        setP({ ...(data as PromiseRow), status: "active" });
      } else {
        setP({ ...(data as PromiseRow), status });
      }
    }
  }

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let active = true;
    const inviteStatus = p ? getPromiseInviteStatus(p) : null;

    if (!p?.counterparty_id || inviteStatus !== "accepted") {
      setCounterpartyDisplayName(null);
      return () => {
        active = false;
      };
    }

    const loadCounterpartyProfile = async () => {
      let supabase;
      try {
        supabase = requireSupabase();
      } catch {
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name,email")
        .eq("id", p.counterparty_id)
        .maybeSingle();

      if (!active) return;
      const displayName = profile?.display_name?.trim();
      const email = profile?.email?.trim();
      setCounterpartyDisplayName(displayName || email || null);
    };

    void loadCounterpartyProfile();

    return () => {
      active = false;
    };
  }, [p?.counterparty_id, p?.invite_status, p?.counterparty_accepted_at, p?.accepted_at]);

  async function markCompleted() {
    if (!p) return;
    setError(null);
    setActionBusy("complete");

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setError(supabaseErrorMessage(err));
      setActionBusy(null);
      return;
    }

    const session = await requireSessionOrRedirect(`/promises/${id}`, supabase);
    if (!session) {
      setActionBusy(null);
      return;
    }

    const res = await fetch(`/api/promises/${p.id}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    setActionBusy(null);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? t("promises.detail.errors.updateStatus"));
      return;
    }

    load();
  }

  async function generateInvite(regenerate = false) {
    if (!p) return;

    const isInviteAccepted = Boolean(p.counterparty_accepted_at);
    const isFinal = p.status === "confirmed" || p.status === "disputed";

    if (!isCreator || isInviteAccepted || isFinal) return;

    setError(null);
    setInviteBusy(regenerate ? "regen" : "generate");

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setError(supabaseErrorMessage(err));
      setInviteBusy(null);
      return;
    }

    const session = await requireSessionOrRedirect(`/promises/${id}`, supabase);
    if (!session) {
      setInviteBusy(null);
      return;
    }

    const token = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const patch: Partial<PromiseRow> = regenerate
      ? { invite_token: token }
      : p.invite_token
      ? {}
      : { invite_token: token };

    if (!Object.keys(patch).length) {
      setInviteBusy(null);
      return;
    }

    const { error } = await supabase.from("promises").update(patch).eq("id", p.id);

    setInviteBusy(null);

    if (error) setError(error.message);
    else load();
  }

  async function markConditionMet() {
    if (!p) return;
    setError(null);
    setConditionBusy(true);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setError(supabaseErrorMessage(err));
      setConditionBusy(false);
      return;
    }

    const session = await requireSessionOrRedirect(`/promises/${id}`, supabase);
    if (!session) {
      setConditionBusy(false);
      return;
    }

    const res = await fetch(`/api/promises/${p.id}/condition-met`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    setConditionBusy(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? t("promises.detail.errors.updateStatus"));
      return;
    }

    load();
  }

  const inviteLink = useMemo(() => {
    if (!p?.invite_token) return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/p/invite/${p.invite_token}`;
  }, [p?.invite_token]);

  async function copyInvite() {
    if (!inviteLink || !canManageInvite || isInviteAccepted || isFinal) return;
    setError(null);
    setInviteBusy("copy");

    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      setError(t("promises.detail.errors.copyClipboard"));
    } finally {
      setInviteBusy(null);
    }
  }

  const executorId = p ? resolveExecutorId(p) : null;
  const counterpartyId = p ? resolveCounterpartyId(p) : null;
  const isExecutor = Boolean(userId && executorId && userId === executorId);
  const isCounterparty = Boolean(
    userId && counterpartyId && userId === counterpartyId && !isExecutor
  );
  const isCreator = Boolean(p && userId === p.creator_id);
  const waitingForReview = p?.status === "completed_by_promisor";
  const inviteStatus = getPromiseInviteStatus(p);
  const isInviteAccepted = isPromiseAccepted(p);
  const uiStatus = p ? getPromiseUiStatus(p) : null;
  const isFinal = Boolean(p && (p.status === "confirmed" || p.status === "disputed"));
  const canManageInvite = Boolean(p && userId === p.creator_id);
  const shouldShowInviteBlock = !isFinal && canManageInvite && inviteStatus !== "declined";
  const showPublicStatus = p?.visibility === "public";
  const publicStatusText = showPublicStatus ? t("promises.detail.publicStatus.public") : "";
  const hasCondition = Boolean(p?.condition_text?.trim());
  const conditionMet = Boolean(p?.condition_met_at);
  const acceptingUserName = useMemo(() => {
    if (!p?.counterparty_id) return t("promises.detail.unknownUser");
    const displayName = counterpartyDisplayName?.trim();
    if (displayName) return displayName;
    return p.counterparty_id.slice(0, 8);
  }, [counterpartyDisplayName, p?.counterparty_id, t]);

  return (
    <div className="mx-auto w-full max-w-3xl py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backLink.href}
          className="text-sm font-medium text-emerald-200 transition hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {backLink.label}
        </Link>
        <div className="flex items-center gap-3">{uiStatus && <StatusPill status={uiStatus} />}</div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-red-300">
          {error}
        </div>
      )}

      {!p ? (
        <div className="text-neutral-400">{t("promises.detail.loading")}</div>
      ) : (
        <>
          <Card title={t("promises.detail.cardTitle")}>
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-semibold text-white">{p.title}</div>
                <div className="mt-2 text-sm text-neutral-400">{dueText}</div>
              </div>

              {showPublicStatus && (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200">
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-300">
                    {t("promises.detail.publicStatus.label")}
                  </span>
                  <span className="text-emerald-200">
                    {publicStatusText}
                  </span>
                </div>
              )}

              <div className="text-sm text-neutral-400">
                {t("promises.detail.inviteStatusLabel")}:{" "}
                <span
                  className={
                    "text-sm font-medium " +
                    (inviteStatus === "accepted" ? "text-emerald-300" : "text-neutral-200")
                  }
                >
                  {t(`promises.inviteStatus.${inviteStatus}`)}
                </span>
              </div>

              {p.counterparty_contact && (
                <div className="text-sm text-neutral-400">
                  {t("promises.detail.counterparty")}:{" "}
                  <span className="text-neutral-200">{p.counterparty_contact}</span>
                </div>
              )}

              {p.details ? (
                <div className="pt-2 text-neutral-200 whitespace-pre-wrap">{p.details}</div>
              ) : (
                <div className="pt-2 text-neutral-500">{t("promises.detail.noDetails")}</div>
              )}

              {hasCondition && (
                <div className="mt-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-slate-200">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
                    {t("promises.detail.conditionLabel")}
                  </p>
                  <div className="mt-2 whitespace-pre-wrap text-slate-100">
                    {p?.condition_text}
                  </div>
                  <div className="mt-3 text-xs text-slate-400">
                    {conditionMet
                      ? t("promises.detail.conditionMet")
                      : t("promises.detail.conditionWaiting")}
                  </div>
                  {isCounterparty && !conditionMet && (
                    <div className="mt-3">
                      <ActionButton
                        label={t("promises.detail.conditionMark")}
                        variant="ok"
                        loading={conditionBusy}
                        disabled={conditionBusy}
                        onClick={markConditionMet}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card title={t("promises.detail.statusActions")}>
            <div className="space-y-3">
              <div className="text-sm text-neutral-300">
                {t("promises.detail.currentStatus")}: <StatusPill status={uiStatus ?? p.status} />
              </div>

              {isExecutor && p.status === "active" && (
                isInviteAccepted ? (
                  <ActionButton
                    label={t("promises.detail.markCompleted")}
                    variant="ok"
                    loading={actionBusy === "complete"}
                    disabled={actionBusy !== null}
                    onClick={() => setShowConfirmModal(true)}
                  />
                ) : (
                  <div className="text-sm text-neutral-400">
                    {inviteStatus === "awaiting_acceptance"
                      ? stripTrailingPeriod(t("promises.detail.shareInvite"))
                      : t(`promises.inviteStatus.${inviteStatus}`)}
                  </div>
                )
              )}

              {!isExecutor && isCounterparty && p.status === "active" && isInviteAccepted && (
                <div className="text-sm text-neutral-400">
                  {stripTrailingPeriod(t("promises.detail.awaitingExecutor"))}
                </div>
              )}

              {isCounterparty && p.status === "completed_by_promisor" && (
                <Link
                  href={`/promises/${p.id}/confirm`}
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-50 shadow-lg shadow-amber-900/30 transition hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                >
                  {t("promises.detail.reviewConfirm")}
                </Link>
              )}

              {waitingForReview && !isCounterparty && (
                <div className="text-sm text-neutral-400">
                  {stripTrailingPeriod(t("promises.detail.waitingReview"))}
                </div>
              )}

              {p.status === "confirmed" && (
                <div className="text-sm text-emerald-300">{t("promises.detail.confirmed")}</div>
              )}

              {p.status === "disputed" && (
                <div className="text-sm text-red-300">{t("promises.detail.disputed")}</div>
              )}

              {inviteStatus === "awaiting_acceptance" && (
                <div className="text-xs text-neutral-500">
                  {t("promises.detail.awaitingAcceptanceHint")}
                </div>
              )}
            </div>
          </Card>

          {shouldShowInviteBlock && (
            <Card title={isInviteAccepted ? t("promises.detail.inviteTitle") : t("promises.detail.inviteLinkTitle")}>
              {isInviteAccepted ? (
                <div className="flex flex-col gap-2 text-sm text-neutral-300">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-100">
                    {t("promises.detail.inviteAccepted")}
                  </div>
                  <div className="text-neutral-300">
                    {t("promises.detail.inviteAcceptedBy", {
                      name: acceptingUserName,
                    })}
                  </div>
                </div>
              ) : !p.invite_token ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-neutral-400">
                    {t("promises.detail.noInviteToken")}
                  </div>

                  <ActionButton
                    label={t("promises.detail.generate")}
                    variant="primary"
                    loading={inviteBusy === "generate"}
                    disabled={inviteBusy !== null}
                    onClick={() => generateInvite(false)}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-neutral-800 bg-black/30 px-4 py-3 text-sm text-neutral-200 break-all">
                    {inviteLink ?? t("promises.detail.inviteFallback")}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <ActionButton
                      label={t("promises.detail.copyLink")}
                      variant="primary"
                      loading={inviteBusy === "copy"}
                      disabled={inviteBusy !== null || !inviteLink}
                      onClick={copyInvite}
                    />

                    <ActionButton
                      label={t("promises.detail.regenerate")}
                      variant="ghost"
                      loading={inviteBusy === "regen"}
                      disabled={inviteBusy !== null}
                      onClick={() => generateInvite(true)}
                    />

                    {inviteLink && (
                      <Link
                        href={`/p/invite/${p.invite_token}`}
                        className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-neutral-800 bg-transparent px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-white/5 hover:border-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                      >
                        {t("promises.detail.openInvite")}
                      </Link>
                    )}
                  </div>

                </div>
              )}
            </Card>
          )}
        </>
      )}

      {showConfirmModal && (
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
                onClick={() => setShowConfirmModal(false)}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                {t("promises.confirmModal.cancel")}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirmModal(false);
                  await markCompleted();
                }}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                {t("promises.confirmModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

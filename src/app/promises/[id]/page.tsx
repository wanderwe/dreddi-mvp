"use client";

import Link from "next/link";
import { Link2, MessageCircle, RefreshCw, Shield } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { resolveCounterpartyId, resolveExecutorId } from "@/lib/promiseParticipants";
import { formatDueDate } from "@/lib/formatDueDate";
import { stripTrailingPeriod } from "@/lib/text";
import { getPromiseLabels } from "@/lib/promiseLabels";
import {
  getPromiseInviteStatus,
  isPromiseAccepted,
  InviteStatus,
} from "@/lib/promiseAcceptance";
import { getNextActionOwner } from "@/lib/promiseNextAction";
import { getPromiseUiStatus, PromiseUiStatus } from "@/lib/promiseUiStatus";
import { IconButton } from "@/app/components/ui/IconButton";
import { StatusPill, StatusPillTone } from "@/app/components/ui/StatusPill";
import { Tooltip } from "@/app/components/ui/Tooltip";

type PromiseRow = {
  id: string;
  title: string;
  is_important: boolean;
  details: string | null;
  condition_text: string | null;
  condition_met_at: string | null;
  condition_met_by: string | null;
  counterparty_contact: string | null;
  due_at: string | null;
  status: PromiseStatus;
  completed_at: string | null;
  disputed_code: string | null;
  dispute_reason: string | null;
  created_at: string;

  invite_token: string | null;
  counterparty_id: string | null;
  counterparty_accepted_at: string | null;
  invite_status: InviteStatus | null;
  invited_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  ignored_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
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




const promiseStatusToneMap: Record<PromiseUiStatus, StatusPillTone> = {
  active: "neutral",
  completed_by_promisor: "attention",
  confirmed: "success",
  disputed: "danger",
  awaiting_acceptance: "neutral",
  declined: "danger",
  expired: "attention",
  cancelled_by_creator: "danger",
};

const promiseStatusIconMap: Record<PromiseUiStatus, "check" | "clock" | "warning"> = {
  active: "clock",
  completed_by_promisor: "warning",
  confirmed: "check",
  disputed: "warning",
  awaiting_acceptance: "clock",
  declined: "warning",
  expired: "warning",
  cancelled_by_creator: "warning",
};

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
    "inline-flex min-h-12 w-full sm:w-auto items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium " +
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
  const backGroupId = searchParams?.get("groupId");
  const actionParam = searchParams?.get("action");

  const [p, setP] = useState<PromiseRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counterpartyDisplayName, setCounterpartyDisplayName] = useState<string | null>(null);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});

  // отдельные "busy" чтобы не ломать UX всего экрана
  const [actionBusy, setActionBusy] = useState<
    "complete" | "confirm" | "dispute" | "accept" | "decline" | "notDelivered" | null
  >(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error">("success");
  const [conditionBusy, setConditionBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState<"generate" | "cancel" | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCounterpartyConfirmModal, setShowCounterpartyConfirmModal] = useState(false);
  const [showNotDeliveredModal, setShowNotDeliveredModal] = useState(false);

  const supabaseErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : "Authentication is unavailable in this preview.";
  const promiseLabels = useMemo(() => getPromiseLabels(t), [t]);

  const dueText = useMemo(() => {
    if (!p?.due_at) return t("promises.detail.noDeadline");
    return (
      formatDueDate(p.due_at, locale, { includeYear: true, includeTime: true }) ??
      t("promises.detail.noDeadline")
    );
  }, [locale, p, t]);

  const backLink = useMemo(() => {
    if (backFrom === "group" && backGroupId) {
      return {
        href: `/promises/groups/${backGroupId}`,
        label: t("promises.detail.backToGroup"),
      };
    }
    if (backFrom === "dashboard") {
      return { href: "/", label: t("promises.detail.backToDashboard") };
    }
    return {
      href: "/promises",
      label: t("promises.detail.backToList", { entityPlural: promiseLabels.entityPlural }),
    };
  }, [backFrom, backGroupId, promiseLabels.entityPlural, t]);

  async function requireSessionOrRedirect(
    nextPath: string,
    supabase: ReturnType<typeof requireSupabase>
  ) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push(localizeLoginPath(nextPath, locale));
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

    const currentQuery = searchParams?.toString();
    const nextPath = `/promises/${id}${currentQuery ? `?${currentQuery}` : ""}`;
    const session = await requireSessionOrRedirect(localizePath(nextPath, locale), supabase);
    if (!session) return;

    const { data, error } = await supabase
      .from("promises")
      .select(
        "id,title,is_important,details,condition_text,condition_met_at,condition_met_by,counterparty_contact,due_at,status,completed_at,disputed_code,dispute_reason,created_at,invite_token,counterparty_id,counterparty_accepted_at,invite_status,invited_at,accepted_at,declined_at,ignored_at,expires_at,cancelled_at,creator_id,promisor_id,promisee_id,visibility"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) setError(error.message);
    else if (!data) setError(t("promises.detail.errors.noAccess"));
    else {
      const status = (data as { status?: unknown }).status;
      if (!isPromiseStatus(status)) {
        const labels = getPromiseLabels(t);
        setError(t("promises.detail.errors.unsupportedStatus", { entity: labels.entity }));
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
  }, [id, actionParam]);

  useEffect(() => {
    if (!id || !userId) return;
    if (actionParam !== "confirm" && actionParam !== "dispute") return;
    router.replace(localizePath(`/promises/${id}/confirm?action=${actionParam}`, locale));
  }, [actionParam, id, router, userId]);

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

  async function confirmCompletion() {
    if (!p) return;
    setError(null);
    setActionBusy("confirm");

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

    const res = await fetch(`/api/promises/${p.id}/confirm`, {
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

    await load();
  }

  async function generateInvite() {
    if (!p) return;

    const isInviteAccepted = Boolean(p.counterparty_accepted_at);
    const isFinal = p.status === "confirmed" || p.status === "disputed";

    if (!isCreator || isInviteAccepted || isFinal) return;

    setError(null);
    setInviteBusy("generate");

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

    const patch: Partial<PromiseRow> = p.invite_token ? {} : { invite_token: token };

    if (!Object.keys(patch).length) {
      setInviteBusy(null);
      return;
    }

    const { error } = await supabase.from("promises").update(patch).eq("id", p.id);

    setInviteBusy(null);

    if (error) setError(error.message);
    else load();
  }

  async function cancelInvite() {
    if (!p || !isCreator || inviteStatus !== "awaiting_acceptance") return;

    setError(null);
    setInviteBusy("cancel");

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

    const res = await fetch(`/api/invites/${p.id}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    setInviteBusy(null);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? t("promises.detail.errors.updateStatus"));
      return;
    }

    await load();
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

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  const inviteLink = useMemo(() => {
    if (!p?.invite_token) return null;
    if (appUrl) return `${appUrl}/p/invite/${p.invite_token}`;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/p/invite/${p.invite_token}`;
  }, [appUrl, p?.invite_token]);

  const promiseLink = useMemo(() => {
    if (!id) return null;
    if (appUrl) return `${appUrl}/promises/${id}`;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/promises/${id}`;
  }, [appUrl, id]);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const setCopyFeedback = (status: "success" | "error") => {
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    setCopyStatus(status);
    copyResetTimer.current = setTimeout(() => {
      setCopyStatus("idle");
    }, 1800);
  };

  const fallbackCopy = (text: string) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.top = "-1000px";
      textarea.style.left = "-1000px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus({ preventScroll: true });
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  };

  const getReminderMessage = () => {
    if (!promiseLink) return null;

    if (locale === "uk") {
      return [
        "Нагадування 👇",
        "Будь ласка, перевір цю угоду:",
        "",
        promiseLink,
        "",
        "Тут є дія, яка очікується від тебе.",
      ].join("\n");
    }

    return [
      "Quick reminder 👇",
      "Please check this agreement:",
      "",
      promiseLink,
      "",
      "There’s an action pending from your side.",
    ].join("\n");
  };

  async function copyReminder() {
    if (!p || !userId || !promiseLink) {
      setToastTone("error");
      setToast(t("promises.detail.reminderCopy.copyFailed"));
      return;
    }

    const message = getReminderMessage();
    if (!message) {
      setToastTone("error");
      setToast(t("promises.detail.reminderCopy.copyFailed"));
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      console.log("[reminder_manual_copy]", { promiseId: p.id, userId });
      setToastTone("success");
      setToast(t("promises.detail.reminderCopy.copied"));
    } catch {
      setToastTone("error");
      setToast(t("promises.detail.reminderCopy.copyFailed"));
    }
  }

  async function copyPromiseLink() {
    if (!promiseLink) {
      setToastTone("error");
      setToast(t("promises.detail.linkCopy.copyFailed"));
      return;
    }

    let didCopy = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(promiseLink);
        didCopy = true;
      } else {
        didCopy = fallbackCopy(promiseLink);
      }
    } catch {
      didCopy = fallbackCopy(promiseLink);
    }

    if (didCopy) {
      setToastTone("success");
      setToast(t("promises.detail.linkCopy.copied"));
      return;
    }

    setToastTone("error");
    setToast(t("promises.detail.linkCopy.copyFailed"));
  }

  async function copyInvite() {
    if (!inviteLink || !canManageInvite || isInviteAccepted || isFinal) return;
    setCopyStatus("idle");

    let didCopy = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
        didCopy = true;
      } else {
        didCopy = fallbackCopy(inviteLink);
      }
    } catch {
      didCopy = fallbackCopy(inviteLink);
    }

    if (didCopy) {
      setCopyFeedback("success");
    } else {
      setCopyFeedback("error");
    }
  }

  async function respondToDeal(action: "accept" | "decline") {
    if (!p) return;

    setError(null);
    setActionBusy(action);

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

    const res = await fetch(`/api/promises/${p.id}/${action}`, {
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

    setToastTone("success");
    setToast(
      action === "accept"
        ? t("promises.detail.acceptedToast", { entity: promiseLabels.entity })
        : t("promises.detail.declinedToast", { entity: promiseLabels.entity })
    );
    await load();
  }

  async function markNotDelivered() {
    if (!p) return;
    setError(null);
    setActionBusy("notDelivered");

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

    const res = await fetch(`/api/promises/${p.id}/dispute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ code: "not_delivered" }),
    });

    setActionBusy(null);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? t("promises.detail.errors.updateStatus"));
      return;
    }

    console.info("[analytics] deal_marked_not_delivered", {
      promise_id: p.id,
      user_id: session.user.id,
      timestamp: new Date().toISOString(),
    });
    await load();
  }

  const executorId = p ? resolveExecutorId(p) : null;
  const counterpartyId = p ? resolveCounterpartyId(p) : null;
  const promiseMadeToId = p?.promisee_id ?? counterpartyId ?? null;
  const isExecutor = Boolean(userId && executorId && userId === executorId);
  const isCounterparty = Boolean(
    userId && counterpartyId && userId === counterpartyId && !isExecutor
  );
  const isCreator = Boolean(p && userId === p.creator_id);
  const canReview = isCounterparty;
  const inviteStatus = getPromiseInviteStatus(p);
  const isInviteAccepted = isPromiseAccepted(p);
  const canRespondToInvite = Boolean(
    p &&
      userId &&
      userId !== p.creator_id &&
      inviteStatus === "awaiting_acceptance" &&
      (!p.counterparty_id || p.counterparty_id === userId)
  );
  const uiStatus = p ? getPromiseUiStatus(p) : null;
  const statusLabelMap: Record<PromiseUiStatus, string> = {
    active: t("promises.status.active"),
    completed_by_promisor: t("promises.status.pendingConfirmation"),
    confirmed: t("promises.status.confirmed"),
    disputed: t("promises.status.disputed"),
    awaiting_acceptance: t("promises.status.awaitingInviteAcceptance"),
    declined: t("promises.inviteStatus.declined"),
    expired: t("promises.inviteStatus.expired"),
    cancelled_by_creator: t("promises.inviteStatus.cancelled_by_creator"),
  };
  const statusLabel = uiStatus ? statusLabelMap[uiStatus] ?? uiStatus : "";
  const isFinal = Boolean(p && (p.status === "confirmed" || p.status === "disputed"));
  const canManageInvite = Boolean(p && userId === p.creator_id);
  const shouldShowInviteBlock = !isFinal && canManageInvite && !isInviteAccepted;
  const canCopyPromiseLink = Boolean(p && inviteStatus === "accepted" && promiseLink);
  const canShareReminder = Boolean(
    p &&
      inviteStatus === "accepted" &&
      (p.status === "active" || p.status === "completed_by_promisor") &&
      getNextActionOwner(p, userId) === "other"
  );
  const canRecreateDeal = Boolean(p && uiStatus === "expired" && isCreator);
  const isDeadlinePassed = Boolean(p?.due_at && new Date(p.due_at).getTime() < Date.now());
  const canMarkNotDelivered = Boolean(
    p &&
      isCounterparty &&
      p.status === "active" &&
      p.due_at &&
      isDeadlinePassed &&
      !p.completed_at &&
      isInviteAccepted
  );
  const canConfirmWithoutExecutorCompletion = Boolean(
    canReview && p?.status === "active" && !p?.completed_at && isInviteAccepted
  );
  const hasStatusActions = Boolean(
      (isExecutor && p?.status === "active" && isInviteAccepted) ||
      canMarkNotDelivered ||
      canConfirmWithoutExecutorCompletion ||
      (canReview && p?.status === "completed_by_promisor") ||
      (canRespondToInvite && p?.status === "active")
  );
  const showPublicStatus = p?.visibility === "public";
  const publicStatusText = showPublicStatus
    ? t("promises.detail.publicStatus.public", { publicEntity: promiseLabels.publicEntity })
    : "";
  const hasCondition = Boolean(p?.condition_text?.trim());
  const conditionMet = Boolean(p?.condition_met_at);
  const getParticipantLabel = (participantId: string | null) => {
    if (!participantId) return t("promises.detail.counterpartyFallback");
    const baseLabel = participantNames[participantId] ?? participantId.slice(0, 8);
    if (userId && participantId === userId) {
      return `${baseLabel} (${t("promises.detail.you")})`;
    }
    return baseLabel;
  };
  const createdByLabel = getParticipantLabel(p?.creator_id ?? null);
  const responsibleLabel = getParticipantLabel(executorId);
  const promiseToLabel = getParticipantLabel(promiseMadeToId);
  const acceptingUserName = useMemo(() => {
    if (!p?.counterparty_id) return t("promises.detail.unknownUser");
    const displayName = counterpartyDisplayName?.trim();
    if (displayName) return displayName;
    return p.counterparty_id.slice(0, 8);
  }, [counterpartyDisplayName, p?.counterparty_id, t]);
  const inviteMetaText = inviteStatus === "accepted"
    ? t("promises.detail.inviteAcceptedByInline", { name: acceptingUserName })
    : t(`promises.inviteStatus.${inviteStatus}`);

  useEffect(() => {
    let active = true;

    const participantIds = Array.from(
      new Set(
        [p?.creator_id, p?.counterparty_id, p?.promisor_id, p?.promisee_id].filter(
          (value): value is string => Boolean(value)
        )
      )
    );

    if (participantIds.length === 0) {
      setParticipantNames({});
      return () => {
        active = false;
      };
    }

    const loadParticipantNames = async () => {
      let supabase;
      try {
        supabase = requireSupabase();
      } catch {
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id,display_name,email")
        .in("id", participantIds);

      if (!active) return;
      const names: Record<string, string> = {};
      for (const profile of data ?? []) {
        const label = profile.display_name?.trim() || profile.email?.trim() || "";
        if (label) names[profile.id] = label;
      }
      setParticipantNames(names);
    };

    void loadParticipantNames();

    return () => {
      active = false;
    };
  }, [p?.counterparty_id, p?.creator_id, p?.promisee_id, p?.promisor_id]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-0 sm:py-10">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={backLink.href}
          className="text-sm font-medium text-emerald-200 transition hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {backLink.label}
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {p && (
            <>
              {canCopyPromiseLink && (
                <Tooltip label={t("promises.detail.linkCopy.tooltip")} placement="bottom-right">
                  <span>
                    <IconButton
                      icon={<Link2 className="h-4 w-4" />}
                      ariaLabel={t("promises.detail.linkCopy.label")}
                      className="h-10 w-10 border-cyan-400/30 text-cyan-200 hover:border-cyan-300/50 hover:bg-cyan-500/10 hover:text-cyan-100"
                      onClick={() => void copyPromiseLink()}
                    />
                  </span>
                </Tooltip>
              )}
              {canShareReminder && (
                <Tooltip label={t("promises.detail.reminderCopy.tooltip")} placement="bottom-right">
                  <span>
                    <IconButton
                      icon={<MessageCircle className="h-4 w-4" />}
                      ariaLabel={t("promises.detail.reminderCopy.label")}
                      className="h-10 w-10 border-sky-400/30 text-sky-200 hover:border-sky-300/50 hover:bg-sky-500/10 hover:text-sky-100"
                      disabled={!userId || !promiseLink}
                      onClick={() => void copyReminder()}
                    />
                  </span>
                </Tooltip>
              )}
              {!canShareReminder && canRecreateDeal && (
                <Tooltip label={t("promises.detail.recreate.tooltip")} placement="bottom-right">
                  <span>
                    <IconButton
                      icon={<RefreshCw className="h-4 w-4" />}
                      ariaLabel={t("promises.detail.recreate.label")}
                      className="h-10 w-10 border-emerald-400/30 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-500/10 hover:text-emerald-100"
                      onClick={() =>
                        router.push(localizePath(`/promises/new?fromPromise=${p.id}`, locale))
                      }
                    />
                  </span>
                </Tooltip>
              )}
            </>
          )}
          {uiStatus && <StatusPill label={statusLabel} tone={promiseStatusToneMap[uiStatus]} icon={promiseStatusIconMap[uiStatus]} className="py-1.5" />}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-red-300">
          {error}
        </div>
      )}

      {toast && (
        <div
          className={`rounded-2xl border p-4 ${
            toastTone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-red-500/30 bg-red-500/10 text-red-100"
          }`}
        >
          {toast}
        </div>
      )}

      {!p ? (
        <div className="text-neutral-400">{t("promises.detail.loading")}</div>
      ) : (
        <>
          <Card title={t("promises.detail.cardTitle", { entity: promiseLabels.entity })}>
            <div className="space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-3xl font-semibold text-white">{p.title}</div>
                  {p.is_important && (
                    <Tooltip label={t("promises.important.tooltip")} placement="top">
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300"
                        aria-label={t("promises.important.label")}
                      >
                        <Shield className="h-4 w-4" aria-hidden />
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                  {t("promises.detail.roles.title")}
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="inline text-slate-400">
                      {t("promises.detail.roles.createdBy")}
                      {": "}
                    </dt>
                    <dd className="inline font-medium text-white">{createdByLabel}</dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-400">
                      {t("promises.detail.roles.responsible")}
                      {": "}
                    </dt>
                    <dd className="inline font-medium text-white">{responsibleLabel}</dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-400">
                      {t("promises.detail.roles.madeTo")}
                      {": "}
                    </dt>
                    <dd className="inline font-medium text-white">{promiseToLabel}</dd>
                  </div>
                </dl>
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

              <div className="text-sm text-slate-400">
                <span>{t("promises.detail.deadline")}</span>
                {": "}
                <span className="font-medium text-white">{dueText}</span>
              </div>
              {p.status === "disputed" && p.disputed_code === "not_delivered" && (
                <div className="text-sm text-amber-200">{t("promises.detail.notDeliveredHint")}</div>
              )}
              {p.status === "disputed" && p.dispute_reason && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  <p className="text-xs uppercase tracking-[0.14em] text-amber-200">
                    {t("promises.detail.disputeExplanationLabel")}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{p.dispute_reason}</p>
                </div>
              )}

              <div className="text-sm text-slate-400">
                <span>{t("promises.detail.inviteLabel")}</span>
                {": "}
                <span
                  className={
                    "font-medium " +
                    (inviteStatus === "accepted" ? "text-emerald-300" : "text-white")
                  }
                >
                  {inviteMetaText}
                </span>
              </div>

              {p.counterparty_contact && (
                <div className="text-sm text-slate-400">
                  <span>{t("promises.detail.counterparty")}</span>
                  {": "}
                  <span className="font-medium text-white">{p.counterparty_contact}</span>
                </div>
              )}

              {p.details ? (
                <div className="pt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">
                  {p.details}
                </div>
              ) : (
                <div className="pt-2 text-sm text-slate-400">{t("promises.detail.noDetails")}</div>
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

          {hasStatusActions && (
            <Card title={t("promises.detail.statusActions")}>
              <div className="space-y-3">
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
                    !canRespondToInvite && (
                      <div className="text-sm text-neutral-400">
                        {inviteStatus === "awaiting_acceptance"
                          ? stripTrailingPeriod(t("promises.detail.shareInvite"))
                          : t(`promises.inviteStatus.${inviteStatus}`)}
                      </div>
                    )
                  )
                )}

                {canReview && p.status === "completed_by_promisor" && (
                  <Link
                    href={`/promises/${p.id}/confirm`}
                    className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-50 shadow-lg shadow-amber-900/30 transition hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 sm:w-auto"
                  >
                    {t("promises.detail.reviewConfirm")}
                  </Link>
                )}

                {canConfirmWithoutExecutorCompletion && (
                  <ActionButton
                    label={t("promises.detail.confirmCompletion")}
                    variant="ok"
                    loading={actionBusy === "confirm"}
                    disabled={actionBusy !== null}
                    onClick={() => setShowCounterpartyConfirmModal(true)}
                  />
                )}

                {canMarkNotDelivered && (
                  <ActionButton
                    label={t("promises.detail.notDelivered")}
                    variant="ghost"
                    loading={actionBusy === "notDelivered"}
                    disabled={actionBusy !== null}
                    onClick={() => setShowNotDeliveredModal(true)}
                  />
                )}

                {canRespondToInvite && p.status === "active" && (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ActionButton
                      label={t("promises.detail.acceptAction")}
                      variant="ok"
                      loading={actionBusy === "accept"}
                      disabled={actionBusy !== null}
                      onClick={() => void respondToDeal("accept")}
                    />
                    <ActionButton
                      label={t("promises.detail.declineAction")}
                      variant="danger"
                      loading={actionBusy === "decline"}
                      disabled={actionBusy !== null}
                      onClick={() => void respondToDeal("decline")}
                    />
                  </div>
                )}
              </div>
            </Card>
          )}

          {shouldShowInviteBlock && (
            <Card title={t("promises.detail.inviteLinkTitle")}>
              {!p.invite_token ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-neutral-400">
                    {t("promises.detail.noInviteToken")}
                  </div>

                  <ActionButton
                    label={t("promises.detail.generate")}
                    variant="primary"
                    loading={inviteBusy === "generate"}
                    disabled={inviteBusy !== null}
                    onClick={generateInvite}
                  />
                </div>
              ) : (
                <div className="relative space-y-3">
                  <span
                    aria-live="polite"
                    className={`pointer-events-none absolute right-3 top-3 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] shadow-lg backdrop-blur transition ${
                      copyStatus === "success"
                        ? "border-emerald-400/50 bg-emerald-500/30 text-emerald-100 opacity-100"
                        : copyStatus === "error"
                        ? "border-red-400/50 bg-red-500/30 text-red-100 opacity-100"
                        : "border-transparent bg-transparent text-transparent opacity-0"
                    }`}
                  >
                    {copyStatus === "success"
                      ? t("promises.detail.copySuccess")
                      : copyStatus === "error"
                      ? t("promises.detail.copyFailed")
                      : t("promises.detail.copySuccess")}
                  </span>

                  <div className="rounded-xl border border-neutral-800 bg-black/30 px-4 py-3 text-sm text-neutral-200 break-all">
                    {inviteLink ?? t("promises.detail.inviteFallback")}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <ActionButton
                      label={t("promises.detail.copyLink")}
                      variant="primary"
                      disabled={inviteBusy !== null || !inviteLink}
                      onClick={copyInvite}
                    />

                    {inviteLink && (
                      <Link
                        href={`/p/invite/${p.invite_token}`}
                        className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-neutral-800 bg-transparent px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-white/5 hover:border-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 sm:w-auto"
                      >
                        {t("promises.detail.openInvite")}
                      </Link>
                    )}

                    {isCreator && inviteStatus === "awaiting_acceptance" && (
                      <ActionButton
                        label={t("promises.detail.withdrawInvite")}
                        variant="danger"
                        loading={inviteBusy === "cancel"}
                        disabled={inviteBusy !== null}
                        onClick={cancelInvite}
                      />
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
              {t("promises.confirmModal.body", { entityLower: promiseLabels.entityLower })}
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

      {showNotDeliveredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0f1a] p-6 shadow-2xl shadow-black/60">
            <h2 className="text-xl font-semibold text-white">
              {t("promises.notDeliveredModal.title")}
            </h2>
            <p className="mt-3 text-sm text-neutral-200">
              {t("promises.notDeliveredModal.body")}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowNotDeliveredModal(false)}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                {t("promises.notDeliveredModal.cancel")}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowNotDeliveredModal(false);
                  await markNotDelivered();
                }}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                {t("promises.notDeliveredModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCounterpartyConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">
              {t("promises.confirmModal.title")}
            </h2>
            <p className="mt-3 text-sm text-neutral-200">
              {t("promises.confirmModal.counterpartyBody", {
                entityLower: promiseLabels.entityLower,
              })}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCounterpartyConfirmModal(false)}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                {t("promises.confirmModal.cancel")}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowCounterpartyConfirmModal(false);
                  await confirmCompletion();
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

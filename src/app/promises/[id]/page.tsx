"use client";

import Link from "next/link";
import {
  ChevronDown,
  Clipboard,
  ExternalLink,
  Link2,
  MessageCircle,
  RefreshCw,
  Shield,
} from "lucide-react";
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
import { isAgreementLiveStatus } from "@/lib/agreementLiveState";
import { buildAgreementFlowState } from "@/lib/agreementFlowState";
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
  condition_proposed_by: string | null;
  counterparty_contact: string | null;
  due_at: string | null;
  status: PromiseStatus;
  completed_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
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

type LifecycleState = {
  key: string;
  label: string;
  complete: boolean;
  current: boolean;
  disputed?: boolean;
};

type AgreementTimelineItem = {
  key: string;
  label: string;
  actor: string;
  timestamp: string;
  description?: string;
  tone?: "success" | "danger" | "attention" | "neutral";
  kind?: "system" | "update";
};
type AgreementUpdate = {
  id: string;
  content: string;
  created_at: string;
  author_display_name?: string | null;
  author_handle?: string | null;
};

function formatTimestamp(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getLifecycleStates(
  promise: PromiseRow,
  uiStatus: PromiseUiStatus,
  t: ReturnType<typeof useT>
): LifecycleState[] {
  const acceptedAt = promise.accepted_at ?? promise.counterparty_accepted_at;

  return buildAgreementFlowState({
    status: promise.status,
    uiStatus,
    acceptedAt,
    completedAt: promise.completed_at,
    confirmedAt: promise.confirmed_at,
    disputedAt: promise.disputed_at,
  }).map((state) => ({
    ...state,
    label: t(`publicAgreement.flow.${state.key}`),
  }));
}

function buildAgreementTimeline(
  promise: PromiseRow,
  labels: { creator: string; accepter: string; executor: string; reviewer: string; system: string },
  uiStatus: PromiseUiStatus,
  t: ReturnType<typeof useT>
): AgreementTimelineItem[] {
  const acceptedAt = promise.accepted_at ?? promise.counterparty_accepted_at;
  const items: AgreementTimelineItem[] = [
    {
      key: "created",
      label: t("publicAgreement.timeline.created"),
      actor: labels.creator,
      timestamp: promise.created_at,
      description: t("publicAgreement.timeline.createdDescription"),
    },
  ];

  if (acceptedAt) {
    items.push({
      key: "accepted",
      label: t("publicAgreement.timeline.accepted"),
      actor: labels.accepter,
      timestamp: acceptedAt,
      description: t("publicAgreement.timeline.acceptedDescription"),
      tone: "success",
    });
  }

  if (promise.completed_at) {
    items.push({
      key: "completed",
      label: t("publicAgreement.timeline.completed"),
      actor: labels.executor,
      timestamp: promise.completed_at,
      description: t("publicAgreement.timeline.completedDescription"),
      tone: "attention",
    });
  }

  if (promise.confirmed_at) {
    items.push({
      key: "confirmed",
      label: t("publicAgreement.timeline.confirmed"),
      actor: labels.reviewer,
      timestamp: promise.confirmed_at,
      description: t("publicAgreement.timeline.confirmedDescription"),
      tone: "success",
    });
  }

  if (promise.disputed_at) {
    items.push({
      key: "disputed",
      label: t("publicAgreement.timeline.disputed"),
      actor: labels.reviewer,
      timestamp: promise.disputed_at,
      description: t("publicAgreement.timeline.disputedDescription"),
      tone: "danger",
    });
  }

  if (promise.declined_at) {
    items.push({
      key: "declined",
      label: t("publicAgreement.timeline.declined"),
      actor: labels.accepter,
      timestamp: promise.declined_at,
      tone: "danger",
    });
  }

  if (promise.cancelled_at) {
    items.push({
      key: "cancelled",
      label: t("publicAgreement.timeline.cancelled"),
      actor: labels.creator,
      timestamp: promise.cancelled_at,
      tone: "danger",
    });
  }

  if (uiStatus === "expired" && promise.expires_at) {
    items.push({
      key: "expired",
      label: t("publicAgreement.timeline.expired"),
      actor: labels.system,
      timestamp: promise.expires_at,
      tone: "attention",
    });
  }

  return items;
}


const promiseStatusToneMap: Record<PromiseUiStatus, StatusPillTone> = {
  active: "neutral",
  completed_by_promisor: "attention",
  confirmed: "success",
  disputed: "danger",
  awaiting_acceptance: "neutral",
  awaiting_creator_confirmation: "attention",
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
  awaiting_creator_confirmation: "clock",
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
    "inline-flex min-h-12 w-full sm:w-auto items-center justify-center rounded-xl border px-4 py-2 text-center text-sm font-medium leading-tight " +
    "transition select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 " +
    "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:shadow-none";

  const ghost =
    "border-white/20 bg-white/[0.035] text-neutral-100 hover:border-white/25 hover:bg-white/[0.07]";

  const primary =
    "border-emerald-400/35 bg-emerald-400/15 text-emerald-50 shadow-lg shadow-emerald-950/20 hover:border-emerald-300/45 hover:bg-emerald-400/20";

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
      <span className="flex w-full items-center justify-center text-center">
        {loading ? t("promises.detail.saving") : label}
      </span>
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
  const [participantProfiles, setParticipantProfiles] = useState<
    Record<string, { label: string; handle: string | null; isPublicProfile: boolean }>
  >({});

  // отдельные "busy" чтобы не ломать UX всего экрана
  const [actionBusy, setActionBusy] = useState<
    "complete" | "confirm" | "dispute" | "accept" | "decline" | "notDelivered" | null
  >(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error">("success");
  const [conditionBusy, setConditionBusy] = useState(false);
  const [confirmConditionBusy, setConfirmConditionBusy] = useState<"confirm" | "cancel" | null>(null);
  const [inviteBusy, setInviteBusy] = useState<"generate" | "cancel" | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCounterpartyConfirmModal, setShowCounterpartyConfirmModal] = useState(false);
  const [showNotDeliveredModal, setShowNotDeliveredModal] = useState(false);
  const [updates, setUpdates] = useState<AgreementUpdate[]>([]);
  const [showUpdateComposer, setShowUpdateComposer] = useState(false);
  const [updateContent, setUpdateContent] = useState("");
  const [updateSubmitState, setUpdateSubmitState] = useState<"idle" | "saving" | "error">("idle");

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
        "id,title,is_important,details,condition_text,condition_met_at,condition_met_by,condition_proposed_by,counterparty_contact,due_at,status,completed_at,confirmed_at,disputed_at,disputed_code,dispute_reason,created_at,invite_token,counterparty_id,counterparty_accepted_at,invite_status,invited_at,accepted_at,declined_at,ignored_at,expires_at,cancelled_at,creator_id,promisor_id,promisee_id,visibility"
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

    if (!p?.counterparty_id || (inviteStatus !== "accepted" && inviteStatus !== "awaiting_creator_confirmation")) {
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

    // Short URL-safe token (10 chars, ~54^10 ≈ 21 trillion combinations)
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const token = Array.from(bytes, b => chars[b % chars.length]).join("");

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

  async function confirmCondition(action: "confirm" | "cancel") {
    if (!p) return;
    setError(null);
    setConfirmConditionBusy(action);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setError(supabaseErrorMessage(err));
      setConfirmConditionBusy(null);
      return;
    }

    const session = await requireSessionOrRedirect(`/promises/${id}`, supabase);
    if (!session) {
      setConfirmConditionBusy(null);
      return;
    }

    const res = await fetch(`/api/promises/${p.id}/confirm-condition`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action }),
    });

    setConfirmConditionBusy(null);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? t("promises.detail.errors.updateStatus"));
      return;
    }

    load();
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
    if (appUrl) return `${appUrl}/join/${p.invite_token}`;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/join/${p.invite_token}`;
  }, [appUrl, p?.invite_token]);

  const promiseLink = useMemo(() => {
    if (!id) return null;
    if (appUrl) return `${appUrl}${localizePath(`/promises/${id}`, locale)}`;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}${localizePath(`/promises/${id}`, locale)}`;
  }, [appUrl, id, locale]);

  const publicAgreementPath = useMemo(() => {
    if (!id) return null;
    return localizePath(`/p/agreements/${id}`, locale);
  }, [id, locale]);


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
      setToastTone("success");
      setToast(t("promises.detail.copySuccess"));
    } else {
      setCopyFeedback("error");
      setToastTone("error");
      setToast(t("promises.detail.copyFailed"));
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
    awaiting_creator_confirmation: t("promises.status.awaitingCreatorConfirmation"),
    declined: t("promises.inviteStatus.declined"),
    expired: t("promises.inviteStatus.expired"),
    cancelled_by_creator: t("promises.inviteStatus.cancelled_by_creator"),
  };
  const statusLabel = uiStatus ? statusLabelMap[uiStatus] ?? uiStatus : "";
  const isFinal = Boolean(p && (p.status === "confirmed" || p.status === "disputed"));
  const isPrivateAgreement = p?.visibility === "private";
  const canAddAgreementUpdate = Boolean(isPrivateAgreement && uiStatus && isAgreementLiveStatus(uiStatus));
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
  const canGenerateInvite = Boolean(shouldShowInviteBlock && !p?.invite_token);
  const canWithdrawInvite = Boolean(
    isCreator && inviteStatus === "awaiting_acceptance" && shouldShowInviteBlock && p?.invite_token
  );
  const isAwaitingInviteResponse = Boolean(
    shouldShowInviteBlock && inviteStatus === "awaiting_acceptance"
  );
  const hasLifecycleActions = Boolean(
    hasStatusActions || canRecreateDeal
  );
  const linkUtilityButtonClass =
    "inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-medium text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";
  const hasCondition = Boolean(p?.condition_text?.trim());
  const conditionMet = Boolean(p?.condition_met_at);
  const getParticipantLabel = (participantId: string | null) => {
    if (!participantId) return t("promises.detail.counterpartyFallback");
    const baseLabel = participantProfiles[participantId]?.label ?? participantId.slice(0, 8);
    if (userId && participantId === userId) {
      return `${baseLabel} (${t("promises.detail.you")})`;
    }
    return baseLabel;
  };
  const getParticipantHref = (participantId: string | null) => {
    if (!participantId) return null;
    const profile = participantProfiles[participantId];
    const handle = profile?.handle?.trim();
    if (!handle || !profile?.isPublicProfile) return null;
    return localizePath(`/u/${handle}`, locale);
  };
  const createdByLabel = getParticipantLabel(p?.creator_id ?? null);
  const accepterId = p?.counterparty_id ?? null;
  const reviewerId =
    p?.promisor_id && p?.promisee_id && p.promisor_id === executorId ? p.promisee_id : p?.promisor_id ?? null;
  const accepterLabel = getParticipantLabel(accepterId);
  const reviewerLabel = getParticipantLabel(reviewerId);
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
  const lifecycleStates = p && uiStatus ? getLifecycleStates(p, uiStatus, t) : [];
  const timeline = p && uiStatus
    ? buildAgreementTimeline(
        p,
        {
          creator: createdByLabel,
          accepter: accepterLabel,
          executor: responsibleLabel,
          reviewer: reviewerLabel,
          system: t("publicAgreement.timeline.system"),
        },
        uiStatus,
        t
      )
    : [];
  if (isPrivateAgreement) {
    for (const update of updates) {
      timeline.push({
        key: `update-${update.id}`,
        label: t("publicAgreement.timeline.update"),
        actor: update.author_display_name?.trim() || update.author_handle?.trim() || t("publicAgreement.timeline.updateAuthorFallback"),
        timestamp: update.created_at,
        description: update.content,
        tone: "neutral",
        kind: "update",
      });
    }
  }
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const remainingUpdateChars = 500 - updateContent.length;
  const detailsText = p?.details?.trim() ?? "";
  const hasDetails = detailsText.length > 0;
  const creatorHref = getParticipantHref(p?.creator_id ?? null);
  const responsibleHref = getParticipantHref(executorId);
  const promiseToHref = getParticipantHref(promiseMadeToId);

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
      setParticipantProfiles({});
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
        .select("id,display_name,email,handle,is_public_profile")
        .in("id", participantIds);

      if (!active) return;
      const profiles: Record<string, { label: string; handle: string | null; isPublicProfile: boolean }> = {};
      for (const profile of data ?? []) {
        const label = profile.display_name?.trim() || profile.email?.trim() || "";
        if (label) {
          profiles[profile.id] = {
            label,
            handle: profile.handle?.trim() || null,
            isPublicProfile: Boolean(profile.is_public_profile),
          };
        }
      }
      setParticipantProfiles(profiles);
    };

    void loadParticipantNames();

    return () => {
      active = false;
    };
  }, [p?.counterparty_id, p?.creator_id, p?.promisee_id, p?.promisor_id]);

  useEffect(() => {
    if (!p?.id || !isPrivateAgreement) return;
    let active = true;
    const loadUpdates = async () => {
      let supabase;
      try {
        supabase = requireSupabase();
      } catch {
        return;
      }
      const session = await requireSessionOrRedirect(`/promises/${p.id}`, supabase);
      if (!session) return;
      const response = await fetch(`/api/promises/${p.id}/updates`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) return;
      const data = (await response.json()) as AgreementUpdate[];
      if (!active) return;
      setUpdates(data);
    };
    void loadUpdates();
    return () => {
      active = false;
    };
  }, [isPrivateAgreement, p?.id]);

  async function submitUpdate() {
    if (!p || updateSubmitState === "saving") return;
    const content = updateContent.trim();
    if (!content) return;
    setUpdateSubmitState("saving");

    let supabase;
    try {
      supabase = requireSupabase();
    } catch {
      setUpdateSubmitState("error");
      return;
    }
    const session = await requireSessionOrRedirect(`/promises/${p.id}`, supabase);
    if (!session) {
      setUpdateSubmitState("error");
      return;
    }

    const response = await fetch(`/api/promises/${p.id}/updates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      setUpdateSubmitState("error");
      return;
    }
    const update = (await response.json()) as AgreementUpdate;
    setUpdates((current) => [...current, update]);
    setUpdateContent("");
    setShowUpdateComposer(false);
    setUpdateSubmitState("idle");
  }

  const historyPanelContent = (
    <div className="mt-4 space-y-3">
      <div className="grid gap-2 sm:grid-cols-5 lg:grid-cols-1">
        {lifecycleStates.map((state, index) => (
          <div
            key={state.key}
            className={[
              "rounded-xl border px-3 py-2 text-xs transition",
              state.current && state.disputed
                ? "border-rose-300/35 bg-rose-300/10 text-rose-50"
                : state.complete
                  ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-50"
                  : state.current
                    ? "border-amber-300/55 bg-black/20 text-amber-100 shadow-[0_0_0_1px_rgba(252,211,77,0.16)]"
                    : "border-white/10 bg-black/15 text-white/35",
            ].join(" ")}
          >
            <span
              className={[
                "mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                state.current && !state.disputed && !state.complete
                  ? "border-amber-300/80 bg-black/35 text-amber-100"
                  : "border-current/25",
              ].join(" ")}
            >
              {state.complete ? "✓" : state.current && !state.disputed ? "•" : index + 1}
            </span>
            {state.label}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {timeline.map((item) => (
          <div key={item.key} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/15 p-3">
            <span
              className={[
                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                item.tone === "success"
                  ? "bg-emerald-300"
                  : item.tone === "danger"
                    ? "bg-rose-300"
                    : item.tone === "attention"
                      ? "bg-amber-300"
                      : "bg-white/45",
              ].join(" ")}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between lg:flex-col lg:gap-0.5">
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="mt-0.5 text-xs text-white/50">{item.actor}</p>
                  {item.description ? (
                    <p className={item.kind === "update" ? "mt-1.5 text-sm text-white/85" : "mt-1.5 text-sm text-white/65"}>
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <time className="text-xs text-white/45" dateTime={item.timestamp}>
                  {formatTimestamp(item.timestamp, locale)}
                </time>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={backLink.href}
        className="inline-flex text-sm font-medium text-emerald-200 transition hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        {backLink.label}
      </Link>

      {error && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-red-300">
          {error}
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center sm:bottom-8">
          <div
            role={toastTone === "success" ? "status" : "alert"}
            aria-live={toastTone === "success" ? "polite" : "assertive"}
            className={`max-w-sm rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl shadow-black/35 backdrop-blur-md sm:max-w-md ${
              toastTone === "success"
                ? "border-emerald-300/35 bg-emerald-500/20 text-emerald-50"
                : "border-red-300/35 bg-red-500/20 text-red-50"
            }`}
          >
            {toast}
          </div>
        </div>
      )}

      {p ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/25 backdrop-blur sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {uiStatus && (
                  <StatusPill
                    label={statusLabel}
                    tone={promiseStatusToneMap[uiStatus]}
                    icon={promiseStatusIconMap[uiStatus]}
                    className="py-1.5"
                  />
                )}
                {p.is_important && (
                  <Tooltip label={t("promises.important.tooltip")} placement="top">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100"
                      aria-label={t("promises.important.label")}
                    >
                      <Shield className="h-3.5 w-3.5" aria-hidden />
                      {t("publicAgreement.reputationStake")}
                    </span>
                  </Tooltip>
                )}
                {p.visibility === "public" && (
                  <>
                    {publicAgreementPath ? (
                      <Link
                        href={publicAgreementPath}
                        className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:border-amber-200/45 hover:bg-amber-400/15 hover:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/35 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                      >
                        <ExternalLink className="h-3.5 w-3.5 opacity-85" aria-hidden />
                        {t("promises.detail.publicStatus.public")}
                        <ExternalLink className="h-3.5 w-3.5 opacity-85" aria-hidden />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">
                        <ExternalLink className="h-3.5 w-3.5 opacity-85" aria-hidden />
                        {t("promises.detail.publicStatus.public")}
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
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
              </div>
            </div>

            <h1 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
              {p.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-slate-200">
                {t("promises.detail.deadline")}: <span className="ml-1 font-semibold text-white">{dueText}</span>
              </span>
            </div>

            {hasDetails && (
              <p className="mt-5 whitespace-pre-wrap break-words text-base leading-7 text-slate-100/85">
                {detailsText}
              </p>
            )}

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                {t("promises.detail.roles.title")}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    {t("promises.detail.roles.createdBy")}
                  </p>
                  <p className="mt-1 min-w-0 text-sm font-medium text-white [overflow-wrap:anywhere]">
                    {creatorHref ? (
                      <Link
                        href={creatorHref}
                        className="underline decoration-white/25 underline-offset-2 transition hover:text-emerald-200 hover:decoration-emerald-300"
                      >
                        {createdByLabel}
                      </Link>
                    ) : (
                      createdByLabel
                    )}
                  </p>
                </div>
                <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    {t("promises.detail.roles.responsible")}
                  </p>
                  <p className="mt-1 min-w-0 text-sm font-medium text-white [overflow-wrap:anywhere]">
                    {responsibleHref ? (
                      <Link
                        href={responsibleHref}
                        className="underline decoration-white/25 underline-offset-2 transition hover:text-emerald-200 hover:decoration-emerald-300"
                      >
                        {responsibleLabel}
                      </Link>
                    ) : (
                      responsibleLabel
                    )}
                  </p>
                </div>
                <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    {t("promises.detail.roles.madeTo")}
                  </p>
                  <p className="mt-1 min-w-0 text-sm font-medium text-white [overflow-wrap:anywhere]">
                    {promiseToHref ? (
                      <Link
                        href={promiseToHref}
                        className="underline decoration-white/25 underline-offset-2 transition hover:text-emerald-200 hover:decoration-emerald-300"
                      >
                        {promiseToLabel}
                      </Link>
                    ) : (
                      promiseToLabel
                    )}
                  </p>
                </div>
                <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    {t("promises.detail.inviteLabel")}
                  </p>
                  <p className="mt-1 min-w-0 text-sm font-medium text-white [overflow-wrap:anywhere]">{inviteMetaText}</p>
                </div>
              </div>
            </div>

            {canAddAgreementUpdate ? (
              <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/75">
                  {t("promises.detail.updates.title")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateComposer((current) => !current);
                    setUpdateSubmitState("idle");
                  }}
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/[0.1]"
                >
                  {t("promises.detail.updates.add")}
                </button>
              </div>
              {showUpdateComposer ? (
                <div className="mt-3 rounded-xl border border-cyan-300/25 bg-black/20 p-3">
                  <label className="text-sm font-semibold text-cyan-50" htmlFor="agreement-update">
                    {p.visibility === "public"
                      ? t("publicAgreement.updates.label")
                      : t("promises.detail.updates.labelPrivate")}
                  </label>
                  <textarea
                    id="agreement-update"
                    value={updateContent}
                    onChange={(event) => {
                      setUpdateContent(event.target.value.slice(0, 500));
                      if (updateSubmitState !== "idle") setUpdateSubmitState("idle");
                    }}
                    placeholder={t("promises.detail.updates.placeholder")}
                    className="mt-2 h-28 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/60"
                  />
                  <div className="mt-2 text-xs text-white/60">
                    {t("publicAgreement.updates.helper", { count: String(remainingUpdateChars) })}
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUpdateComposer(false);
                        setUpdateContent("");
                        setUpdateSubmitState("idle");
                      }}
                      className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white/80 transition hover:bg-white/[0.08]"
                    >
                      {t("publicAgreement.updates.cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitUpdate()}
                      disabled={!updateContent.trim() || updateSubmitState === "saving"}
                      className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-400/15 px-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateSubmitState === "saving"
                        ? t("publicAgreement.updates.saving")
                        : t("publicAgreement.updates.publish")}
                    </button>
                  </div>
                  {updateSubmitState === "error" ? (
                    <p className="mt-2 text-xs text-rose-200">{t("publicAgreement.updates.error")}</p>
                  ) : null}
                </div>
              ) : null}
              </div>
            ) : null}

            {hasLifecycleActions && (
              <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
                    {t("promises.detail.statusActions")}
                  </p>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
                        <div className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-center text-sm font-medium leading-tight text-white/65 sm:w-auto">
                          {inviteStatus === "awaiting_acceptance"
                            ? stripTrailingPeriod(t("promises.detail.shareInvite"))
                            : t(`promises.inviteStatus.${inviteStatus}`)}
                        </div>
                      )
                    )
                  )}

                  {canReview && p.status === "completed_by_promisor" && (
                    <>
                      <Link
                        href={`/promises/${p.id}/confirm?action=confirm`}
                        className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 sm:w-auto"
                      >
                        {t("promises.confirm.confirm")}
                      </Link>
                      <Link
                        href={`/promises/${p.id}/confirm?action=dispute`}
                        className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-rose-300/40 bg-transparent px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 sm:w-auto"
                      >
                        {t("promises.confirm.dispute")}
                      </Link>
                    </>
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
                    <>
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
                    </>
                  )}

                  {canGenerateInvite && (
                    <ActionButton
                      label={t("promises.detail.generate")}
                      variant="primary"
                      loading={inviteBusy === "generate"}
                      disabled={inviteBusy !== null}
                      onClick={generateInvite}
                    />
                  )}

                  {canWithdrawInvite && !isAwaitingInviteResponse && (
                    <ActionButton
                      label={t("promises.detail.withdrawInvite")}
                      variant="danger"
                      loading={inviteBusy === "cancel"}
                      disabled={inviteBusy !== null}
                      onClick={cancelInvite}
                    />
                  )}

                  {canRecreateDeal && (
                    <button
                      type="button"
                      className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-50 transition hover:border-emerald-300/40 hover:bg-emerald-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 sm:w-auto"
                      onClick={() => router.push(localizePath(`/promises/new?fromPromise=${p.id}`, locale))}
                    >
                      <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="text-center">{t("promises.detail.recreate.label")}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Creator banner: invitee proposed a condition change */}
            {isCreator && inviteStatus === "awaiting_creator_confirmation" && p.condition_text && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {t("promises.detail.conditionProposedBanner.title")}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-100">
                  {p.condition_text}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {t("promises.detail.conditionProposedBanner.body")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton
                    label={
                      confirmConditionBusy === "confirm"
                        ? t("promises.detail.conditionProposedBanner.confirming")
                        : t("promises.detail.conditionProposedBanner.confirm")
                    }
                    variant="ok"
                    loading={confirmConditionBusy === "confirm"}
                    disabled={confirmConditionBusy !== null}
                    onClick={() => void confirmCondition("confirm")}
                  />
                  <ActionButton
                    label={
                      confirmConditionBusy === "cancel"
                        ? t("promises.detail.conditionProposedBanner.cancelling")
                        : t("promises.detail.conditionProposedBanner.cancel")
                    }
                    variant="danger"
                    loading={confirmConditionBusy === "cancel"}
                    disabled={confirmConditionBusy !== null}
                    onClick={() => void confirmCondition("cancel")}
                  />
                </div>
              </div>
            )}

            {hasCondition && inviteStatus !== "awaiting_creator_confirmation" && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                  {t("promises.detail.conditionLabel")}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">
                  {p.condition_text}
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                      {t("promises.detail.conditionStatusLabel")}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white/75">
                      {conditionMet
                        ? t("promises.detail.conditionMet")
                        : t("promises.detail.conditionWaiting")}
                    </p>
                  </div>
                  {isCounterparty && !conditionMet && (
                    <ActionButton
                      label={t("promises.detail.conditionMark")}
                      variant="ok"
                      loading={conditionBusy}
                      disabled={conditionBusy}
                      onClick={markConditionMet}
                    />
                  )}
                </div>
              </div>
            )}

            {(p.status === "disputed" &&
              (p.disputed_code === "not_delivered" || Boolean(p.dispute_reason?.trim()))) && (
              <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
                  {t("promises.detail.disputeReasonLabel")}
                </p>
                <div className="mt-2 space-y-2 text-sm leading-6">
                  {p.disputed_code === "not_delivered" && <p>{t("promises.detail.notDeliveredHint")}</p>}
                  {p.dispute_reason && <p className="whitespace-pre-wrap">{p.dispute_reason}</p>}
                </div>
              </div>
            )}

            {isAwaitingInviteResponse && (
              <div className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/75">
                  {t("promises.detail.inviteTitle")}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1.5">
                  {canGenerateInvite ? (
                    <ActionButton
                      label={t("promises.detail.generate")}
                      variant="primary"
                      loading={inviteBusy === "generate"}
                      disabled={inviteBusy !== null}
                      onClick={generateInvite}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-300/35 bg-emerald-400/18 px-2.5 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/45 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        disabled={inviteBusy !== null || !inviteLink}
                        onClick={copyInvite}
                      >
                        <Clipboard className="h-4 w-4" aria-hidden />
                      {t("promises.detail.copyInvitePrimary")}
                      </button>
                      <Link href={`/join/${p.invite_token}`} className={`${linkUtilityButtonClass} px-2.5 sm:w-auto`}>
                        <ExternalLink className="h-4 w-4" aria-hidden />
                        {t("promises.detail.openInviteShort")}
                      </Link>
                      {canWithdrawInvite && (
                        <button
                          type="button"
                          className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg px-1.5 py-1 text-xs font-medium text-white/55 transition hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-60 sm:ml-auto"
                          disabled={inviteBusy !== null}
                          onClick={cancelInvite}
                        >
                          {inviteBusy === "cancel"
                            ? t("promises.detail.saving")
                            : t("promises.detail.withdrawInviteShort")}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          <details className="group rounded-2xl border border-white/10 bg-neutral-900/25 p-4 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-white marker:hidden">
              <span>{t("promises.detail.historyTitle")}</span>
              <ChevronDown
                className="h-4 w-4 text-white/45 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            {historyPanelContent}
          </details>
          </div>

          <aside className="hidden lg:block lg:sticky lg:top-6">
            <section className="rounded-2xl border border-white/10 bg-neutral-900/25 p-4">
              <h2 className="text-sm font-medium text-white">{t("promises.detail.historyTitle")}</h2>
              {historyPanelContent}
            </section>
          </aside>
        </div>
      ) : !error ? (
        <div className="text-neutral-400">{t("promises.detail.loading")}</div>
      ) : null}

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

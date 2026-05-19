"use client";

import Link from "next/link";
import {
  ChevronDown,
  Clipboard,
  ExternalLink,
  Eye,
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
  const base: LifecycleState[] = [
    { key: "created", label: t("publicAgreement.flow.created"), complete: true, current: false },
    {
      key: "accepted",
      label: t("publicAgreement.flow.accepted"),
      complete: Boolean(acceptedAt),
      current: uiStatus === "awaiting_acceptance",
    },
    {
      key: "active",
      label: t("publicAgreement.flow.active"),
      complete: promise.status !== "active",
      current: uiStatus === "active",
    },
    {
      key: "completed",
      label: t("publicAgreement.flow.completed"),
      complete: Boolean(promise.completed_at || promise.confirmed_at || promise.disputed_at),
      current: uiStatus === "completed_by_promisor",
    },
    {
      key: "confirmed",
      label: t("publicAgreement.flow.confirmed"),
      complete: promise.status === "confirmed",
      current: promise.status === "confirmed",
    },
  ];

  if (promise.status === "disputed") {
    return [
      ...base.slice(0, 4),
      {
        key: "disputed",
        label: t("publicAgreement.flow.disputed"),
        complete: true,
        current: true,
        disputed: true,
      },
    ];
  }

  return base;
}

function buildAgreementTimeline(
  promise: PromiseRow,
  labels: { creator: string; counterparty: string; system: string },
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
      actor: labels.counterparty,
      timestamp: acceptedAt,
      description: t("publicAgreement.timeline.acceptedDescription"),
      tone: "success",
    });
  }

  if (promise.completed_at) {
    items.push({
      key: "completed",
      label: t("publicAgreement.timeline.completed"),
      actor: labels.counterparty,
      timestamp: promise.completed_at,
      description: t("publicAgreement.timeline.completedDescription"),
      tone: "attention",
    });
  }

  if (promise.confirmed_at) {
    items.push({
      key: "confirmed",
      label: t("publicAgreement.timeline.confirmed"),
      actor: labels.creator,
      timestamp: promise.confirmed_at,
      description: t("publicAgreement.timeline.confirmedDescription"),
      tone: "success",
    });
  }

  if (promise.disputed_at) {
    items.push({
      key: "disputed",
      label: t("publicAgreement.timeline.disputed"),
      actor: labels.creator,
      timestamp: promise.disputed_at,
      description: t("publicAgreement.timeline.disputedDescription"),
      tone: "danger",
    });
  }

  if (promise.declined_at) {
    items.push({
      key: "declined",
      label: t("publicAgreement.timeline.declined"),
      actor: labels.counterparty,
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
        "id,title,is_important,details,condition_text,condition_met_at,condition_met_by,counterparty_contact,due_at,status,completed_at,confirmed_at,disputed_at,disputed_code,dispute_reason,created_at,invite_token,counterparty_id,counterparty_accepted_at,invite_status,invited_at,accepted_at,declined_at,ignored_at,expires_at,cancelled_at,creator_id,promisor_id,promisee_id,visibility"
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
    if (appUrl) return `${appUrl}${localizePath(`/promises/${id}`, locale)}`;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}${localizePath(`/promises/${id}`, locale)}`;
  }, [appUrl, id, locale]);

  const publicAgreementPath = useMemo(() => {
    if (!id) return null;
    return localizePath(`/p/agreements/${id}`, locale);
  }, [id, locale]);

  const publicAgreementLink = useMemo(() => {
    if (!publicAgreementPath) return null;
    if (appUrl) return `${appUrl}${publicAgreementPath}`;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}${publicAgreementPath}`;
  }, [appUrl, publicAgreementPath]);

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

  async function copyPublicAgreementLink() {
    if (!publicAgreementLink) {
      setToastTone("error");
      setToast(t("promises.detail.publicAgreementLink.copyFailed"));
      return;
    }

    let didCopy = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicAgreementLink);
        didCopy = true;
      } else {
        didCopy = fallbackCopy(publicAgreementLink);
      }
    } catch {
      didCopy = fallbackCopy(publicAgreementLink);
    }

    if (didCopy) {
      setToastTone("success");
      setToast(t("promises.detail.publicAgreementLink.copied"));
      return;
    }

    setToastTone("error");
    setToast(t("promises.detail.publicAgreementLink.copyFailed"));
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
  const canSharePublicAgreement = Boolean(showPublicStatus && publicAgreementPath && publicAgreementLink);
  const canGenerateInvite = Boolean(shouldShowInviteBlock && !p?.invite_token);
  const canWithdrawInvite = Boolean(
    isCreator && inviteStatus === "awaiting_acceptance" && shouldShowInviteBlock && p?.invite_token
  );
  const isAwaitingInviteResponse = Boolean(
    shouldShowInviteBlock && inviteStatus === "awaiting_acceptance"
  );
  const hasToolCards = Boolean(canSharePublicAgreement);
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
          counterparty: responsibleLabel,
          system: t("publicAgreement.timeline.system"),
        },
        uiStatus,
        t
      )
    : [];
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6 sm:py-10">
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

      {p ? (
        <>
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
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    {t("promises.detail.publicStatus.public")}
                  </span>
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
                <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    {t("promises.detail.roles.createdBy")}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-white">
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
                <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    {t("promises.detail.roles.responsible")}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-white">
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
                <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    {t("promises.detail.roles.madeTo")}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-white">
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
                <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    {t("promises.detail.inviteLabel")}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-white">{inviteMetaText}</p>
                </div>
              </div>
              {p.counterparty_contact && (
                <p className="mt-3 text-xs leading-5 text-white/50">
                  {t("promises.detail.counterparty")}: <span className="text-white/75">{p.counterparty_contact}</span>
                </p>
              )}
            </div>

            {hasLifecycleActions && (
              <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
                  {t("promises.detail.statusActions")}
                </p>
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
                        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/65">
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
                      className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 sm:w-auto"
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

                  {canWithdrawInvite && (
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
                      <RefreshCw className="h-4 w-4" aria-hidden />
                      {t("promises.detail.recreate.label")}
                    </button>
                  )}
                </div>
              </div>
            )}

            {(hasCondition || p.status === "disputed") && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                {hasCondition && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                      {t("promises.detail.conditionLabel")}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">
                      {p.condition_text}
                    </p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-white/50">
                        {conditionMet
                          ? t("promises.detail.conditionMet")
                          : t("promises.detail.conditionWaiting")}
                      </p>
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
                  </>
                )}
                {p.status === "disputed" && p.disputed_code === "not_delivered" && (
                  <p className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                    {t("promises.detail.notDeliveredHint")}
                  </p>
                )}
                {p.status === "disputed" && p.dispute_reason && (
                  <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    <p className="text-xs uppercase tracking-[0.14em] text-amber-200">
                      {t("promises.detail.disputeExplanationLabel")}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{p.dispute_reason}</p>
                  </div>
                )}
              </div>
            )}

            {isAwaitingInviteResponse && (
              <div className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/75">
                  {t("promises.detail.inviteTitle")}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
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
                        className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-300/35 bg-emerald-400/18 px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/45 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        disabled={inviteBusy !== null || !inviteLink}
                        onClick={copyInvite}
                      >
                        <Clipboard className="h-4 w-4" aria-hidden />
                      {t("promises.detail.copyInvitePrimary")}
                      </button>
                      <Link href={`/p/invite/${p.invite_token}`} className={`${linkUtilityButtonClass} sm:w-auto`}>
                        <ExternalLink className="h-4 w-4" aria-hidden />
                        {t("promises.detail.openInvite")}
                      </Link>
                    </>
                  )}
                </div>
                {!canGenerateInvite && canWithdrawInvite && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex min-h-9 cursor-pointer items-center rounded-lg px-1.5 py-1 text-xs font-medium text-white/55 transition hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={inviteBusy !== null}
                      onClick={cancelInvite}
                    >
                      {inviteBusy === "cancel" ? t("promises.detail.saving") : t("promises.detail.withdrawInvite")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {hasToolCards && (
            <details className="group rounded-2xl border border-white/10 bg-neutral-900/30 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-white marker:hidden">
                <span>{t("promises.detail.toolsTitle")}</span>
                <ChevronDown
                  className="h-4 w-4 text-white/45 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="mt-4 space-y-3">
                {canSharePublicAgreement && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-white">
                        {t("promises.detail.publicAgreementLink.title")}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => void copyPublicAgreementLink()}
                        className={linkUtilityButtonClass}
                      >
                        <Clipboard className="h-4 w-4" aria-hidden />
                        {t("promises.detail.publicAgreementLink.copy")}
                      </button>
                      <Link
                        href={publicAgreementPath!}
                        className={linkUtilityButtonClass}
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden />
                        {t("promises.detail.publicAgreementLink.open")}
                      </Link>
                    </div>
                  </div>
                )}

              </div>
            </details>
          )}

          <details className="group rounded-2xl border border-white/10 bg-neutral-900/25 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-white marker:hidden">
              <span>{t("promises.detail.historyTitle")}</span>
              <ChevronDown
                className="h-4 w-4 text-white/45 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="mt-4 space-y-4">
              <div className="grid gap-2 sm:grid-cols-5">
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
                            ? "border-amber-300/35 bg-amber-300/10 text-amber-50"
                            : "border-white/10 bg-black/15 text-white/35",
                    ].join(" ")}
                  >
                    <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/25 text-[10px]">
                      {state.complete ? "✓" : index + 1}
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
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{item.label}</p>
                          <p className="mt-0.5 text-xs text-white/50">{item.actor}</p>
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
          </details>
        </>
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

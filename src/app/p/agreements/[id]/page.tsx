"use client";

import { Check, Clipboard, Eye, Link2, MessageSquareText, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { StatusPill } from "@/app/components/ui/StatusPill";
import { Tooltip } from "@/app/components/ui/Tooltip";
import type { StatusPillTone } from "@/app/components/ui/StatusPill";
import { formatDueDate } from "@/lib/formatDueDate";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/locales";
import { isPromiseStatus } from "@/lib/promiseStatus";
import type { PromiseStatus } from "@/lib/promiseStatus";
import { getPromiseUiStatus } from "@/lib/promiseUiStatus";
import { supabaseOptional } from "@/lib/supabaseClient";
import type { PromiseUiStatus } from "@/lib/promiseUiStatus";

type PublicAgreementUpdate = {
  id: string;
  content: string;
  created_at: string;
  author_display_name: string | null;
  author_handle: string | null;
};

type PublicAgreementRow = {
  id: string;
  title: string | null;
  details: string | null;
  condition_text: string | null;
  is_important: boolean | null;
  status: string | null;
  invite_status: string | null;
  created_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  accepted_at: string | null;
  counterparty_accepted_at: string | null;
  declined_at: string | null;
  ignored_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  creator_id?: string | null;
  responsible_side_id?: string | null;
  counterparty_id?: string | null;
  creator_display_name: string | null;
  creator_handle: string | null;
  creator_is_public_profile?: boolean | null;
  counterparty_display_name: string | null;
  counterparty_handle: string | null;
  counterparty_is_public_profile?: boolean | null;
  counterparty_contact: string | null;
  accepted_by_display_name?: string | null;
  accepted_by_handle?: string | null;
  accepted_by_is_public_profile?: boolean | null;
  viewer_can_update?: boolean | null;
  updates_available?: boolean | null;
  updates?: PublicAgreementUpdate[] | null;
  viewer_following?: boolean | null;
  followers_count?: number | null;
  viewer_can_follow?: boolean | null;
};

type PublicAgreement = PublicAgreementRow & {
  title: string;
  status: PromiseStatus;
  created_at: string;
  uiStatus: PromiseUiStatus;
};

type TimelineItem = {
  key: string;
  label: string;
  actor: string;
  timestamp: string;
  description?: string;
  tone?: "success" | "danger" | "attention" | "neutral" | "update";
  kind?: "system" | "update";
};

type FlowState = {
  key: string;
  label: string;
  complete: boolean;
  current: boolean;
  disputed?: boolean;
};

const statusToneMap: Record<PromiseUiStatus, StatusPillTone> = {
  active: "neutral",
  completed_by_promisor: "attention",
  confirmed: "success",
  disputed: "danger",
  awaiting_acceptance: "neutral",
  declined: "danger",
  expired: "attention",
  cancelled_by_creator: "danger",
};

const statusIconMap: Record<PromiseUiStatus, "check" | "clock" | "warning"> = {
  active: "clock",
  completed_by_promisor: "warning",
  confirmed: "check",
  disputed: "warning",
  awaiting_acceptance: "clock",
  declined: "warning",
  expired: "warning",
  cancelled_by_creator: "warning",
};

const isLikelyPrivateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

function displayProfileName(displayName: string | null, handle: string | null, fallback: string) {
  const cleanName = displayName?.trim();
  if (cleanName) return cleanName;
  const cleanHandle = handle?.trim();
  if (cleanHandle) return `@${cleanHandle}`;
  return fallback;
}

function displayUpdateAuthorName(update: PublicAgreementUpdate, fallback: string) {
  return displayProfileName(update.author_display_name, update.author_handle, fallback);
}

function displayCounterpartyName(row: PublicAgreement, fallback: string) {
  const profileName = displayProfileName(
    row.counterparty_display_name,
    row.counterparty_handle,
    ""
  );
  if (profileName) return profileName;
  const contact = row.counterparty_contact?.trim();
  if (contact && !isLikelyPrivateEmail(contact)) return contact;
  return fallback;
}


function displayAcceptedByName(row: PublicAgreement, fallback: string) {
  const profileName = displayProfileName(
    row.accepted_by_display_name ?? null,
    row.accepted_by_handle ?? null,
    ""
  );
  if (profileName) return profileName;
  const contact = row.counterparty_contact?.trim();
  if (contact && !isLikelyPrivateEmail(contact)) return contact;
  return fallback;
}
function getPublicProfileHref(
  handle: string | null,
  isPublicProfile: boolean | null | undefined,
  locale: Locale
) {
  const cleanHandle = handle?.trim();
  if (!cleanHandle || !isPublicProfile) return null;
  return localizePath(`/u/${cleanHandle}`, locale);
}

function formatTimestamp(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeAgreement(row: PublicAgreementRow): PublicAgreement | null {
  if (!row.title || !row.created_at || !isPromiseStatus(row.status)) return null;
  return {
    ...row,
    title: row.title,
    status: row.status,
    created_at: row.created_at,
    uiStatus: getPromiseUiStatus({
      status: row.status,
      invite_status: row.invite_status,
      accepted_at: row.accepted_at,
      counterparty_accepted_at: row.counterparty_accepted_at,
      declined_at: row.declined_at,
      ignored_at: row.ignored_at,
      expires_at: row.expires_at,
      cancelled_at: row.cancelled_at,
    }),
  };
}

function getFlowStates(agreement: PublicAgreement, t: ReturnType<typeof useT>): FlowState[] {
  const acceptedAt = agreement.accepted_at ?? agreement.counterparty_accepted_at;
  const base: FlowState[] = [
    { key: "created", label: t("publicAgreement.flow.created"), complete: true, current: false },
    {
      key: "accepted",
      label: t("publicAgreement.flow.accepted"),
      complete: Boolean(acceptedAt),
      current: agreement.uiStatus === "awaiting_acceptance",
    },
    { key: "active", label: t("publicAgreement.flow.active"), complete: agreement.status !== "active", current: agreement.uiStatus === "active" },
    { key: "completed", label: t("publicAgreement.flow.completed"), complete: Boolean(agreement.completed_at || agreement.confirmed_at || agreement.disputed_at), current: agreement.uiStatus === "completed_by_promisor" },
    { key: "confirmed", label: t("publicAgreement.flow.confirmed"), complete: agreement.status === "confirmed", current: agreement.status === "confirmed" },
  ];

  if (agreement.status === "disputed") {
    return [
      ...base.slice(0, 4),
      { key: "disputed", label: t("publicAgreement.flow.disputed"), complete: true, current: true, disputed: true },
    ];
  }

  return base;
}

function buildTimeline(
  agreement: PublicAgreement,
  labels: { creator: string; counterparty: string; system: string; updateFallback: string },
  t: ReturnType<typeof useT>
): TimelineItem[] {
  const acceptedAt = agreement.accepted_at ?? agreement.counterparty_accepted_at;
  const items: TimelineItem[] = [
    {
      key: "created",
      label: t("publicAgreement.timeline.created"),
      actor: labels.creator,
      timestamp: agreement.created_at,
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

  if (agreement.completed_at) {
    items.push({
      key: "completed",
      label: t("publicAgreement.timeline.completed"),
      actor: labels.counterparty,
      timestamp: agreement.completed_at,
      description: t("publicAgreement.timeline.completedDescription"),
      tone: "attention",
    });
  }

  if (agreement.confirmed_at) {
    items.push({
      key: "confirmed",
      label: t("publicAgreement.timeline.confirmed"),
      actor: labels.creator,
      timestamp: agreement.confirmed_at,
      description: t("publicAgreement.timeline.confirmedDescription"),
      tone: "success",
    });
  }

  if (agreement.disputed_at) {
    items.push({
      key: "disputed",
      label: t("publicAgreement.timeline.disputed"),
      actor: labels.creator,
      timestamp: agreement.disputed_at,
      description: t("publicAgreement.timeline.disputedDescription"),
      tone: "danger",
    });
  }

  if (agreement.declined_at) {
    items.push({
      key: "declined",
      label: t("publicAgreement.timeline.declined"),
      actor: labels.counterparty,
      timestamp: agreement.declined_at,
      tone: "danger",
    });
  }

  if (agreement.cancelled_at) {
    items.push({
      key: "cancelled",
      label: t("publicAgreement.timeline.cancelled"),
      actor: labels.creator,
      timestamp: agreement.cancelled_at,
      tone: "danger",
    });
  }

  for (const update of agreement.updates ?? []) {
    items.push({
      key: `update-${update.id}`,
      label: t("publicAgreement.timeline.update"),
      actor: displayUpdateAuthorName(update, labels.updateFallback),
      timestamp: update.created_at,
      description: update.content,
      tone: "update",
      kind: "update",
    });
  }

  const isExpired = agreement.uiStatus === "expired" && agreement.expires_at;
  if (isExpired) {
    items.push({
      key: "expired",
      label: t("publicAgreement.timeline.expired"),
      actor: labels.system,
      timestamp: agreement.expires_at!,
      tone: "attention",
    });
  }

  return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export default function PublicAgreementPage() {
  const t = useT();
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [agreement, setAgreement] = useState<PublicAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [updateContent, setUpdateContent] = useState("");
  const [isUpdateFormOpen, setIsUpdateFormOpen] = useState(false);
  const [updateSubmitState, setUpdateSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [followState, setFollowState] = useState<"idle" | "saving" | "error">("idle");
  const searchParams = useSearchParams();

  useEffect(() => {
    let active = true;

    const loadAgreement = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        const session = supabaseOptional ? (await supabaseOptional.auth.getSession()).data.session : null;
        const response = await fetch(`/api/public/agreements/${encodeURIComponent(id)}`, {
          cache: "no-store",
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });

        if (!active) return;

        if (response.status === 404) {
          setError(t("publicAgreement.errors.notPublic"));
          setAgreement(null);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          setError(t("publicAgreement.errors.load"));
          setAgreement(null);
          setLoading(false);
          return;
        }

        const row = (await response.json()) as PublicAgreementRow;
        const normalized = normalizeAgreement(row);
        if (!normalized) {
          setError(t("publicAgreement.errors.notPublic"));
          setAgreement(null);
        } else {
          setAgreement(normalized);
        }
      } catch {
        if (!active) return;
        setError(t("publicAgreement.errors.load"));
        setAgreement(null);
      }

      setLoading(false);
    };

    void loadAgreement();

    return () => {
      active = false;
    };
  }, [id, t]);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, [agreement?.id]);

  const creatorName = agreement
    ? displayProfileName(
        agreement.creator_display_name,
        agreement.creator_handle,
        t("publicAgreement.participants.creatorFallback")
      )
    : "";
  const counterpartyName = agreement
    ? displayCounterpartyName(agreement, t("publicAgreement.participants.counterpartyFallback"))
    : "";
  const acceptedByName = agreement
    ? displayAcceptedByName(agreement, t("publicAgreement.participants.counterpartyFallback"))
    : "";
  const isSelfResponsible = Boolean(
    agreement?.creator_id &&
      agreement?.responsible_side_id &&
      agreement.creator_id === agreement.responsible_side_id
  );

  const creatorHref = agreement
    ? getPublicProfileHref(agreement.creator_handle, agreement.creator_is_public_profile, locale)
    : null;
  const counterpartyHref = agreement
    ? getPublicProfileHref(agreement.counterparty_handle, agreement.counterparty_is_public_profile, locale)
    : null;
  const acceptedByHref = agreement
    ? getPublicProfileHref(agreement.accepted_by_handle ?? null, agreement.accepted_by_is_public_profile, locale)
    : null;

  const timeline = agreement
    ? buildTimeline(
        agreement,
        {
          creator: creatorName,
          counterparty: counterpartyName,
          system: t("publicAgreement.timeline.system"),
          updateFallback: t("publicAgreement.timeline.updateAuthorFallback"),
        },
        t
      )
    : [];

  const flowStates = agreement ? getFlowStates(agreement, t) : [];
  const dueText = agreement?.due_at
    ? formatDueDate(agreement.due_at, locale, { includeYear: true, includeTime: true })
    : null;

  const canAddUpdate = Boolean(agreement?.viewer_can_update && agreement.updates_available !== false);
  const shouldShowUpdatesUnavailable = Boolean(
    agreement?.viewer_can_update && agreement.updates_available === false
  );
  const remainingUpdateChars = 500 - updateContent.length;

  const followersCount = Math.max(0, agreement?.followers_count ?? 0);
  const shouldShowFollowersCount = followersCount > 0;
  const followLabel = agreement?.viewer_following
    ? `${t("publicAgreement.following")}${shouldShowFollowersCount ? ` · ${followersCount}` : ""}`
    : `${t("publicAgreement.follow")}${shouldShowFollowersCount ? ` · ${followersCount}` : ""}`;

  const handleSubmitUpdate = async () => {
    if (!agreement || !canAddUpdate || updateSubmitState === "saving") return;

    const content = updateContent.trim();
    if (!content || content.length > 500) {
      setUpdateSubmitState("error");
      return;
    }

    const session = supabaseOptional ? (await supabaseOptional.auth.getSession()).data.session : null;
    if (!session?.access_token) {
      setUpdateSubmitState("error");
      return;
    }

    setUpdateSubmitState("saving");
    try {
      const response = await fetch(`/api/public/agreements/${encodeURIComponent(agreement.id)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error("Update failed");

      const update = (await response.json()) as PublicAgreementUpdate;
      setAgreement((current) =>
        current
          ? {
              ...current,
              updates: [...(current.updates ?? []), update],
            }
          : current
      );
      setUpdateContent("");
      setIsUpdateFormOpen(false);
      setUpdateSubmitState("idle");
    } catch {
      setUpdateSubmitState("error");
    }
  };



  useEffect(() => {
    const shouldAutoFollow = searchParams.get("follow") === "1";
    if (!agreement?.id || !shouldAutoFollow || agreement.viewer_following) return;

    const run = async () => {
      if (!supabaseOptional) return;
      const session = (await supabaseOptional.auth.getSession()).data.session;
      if (!session?.access_token) return;
      const response = await fetch(`/api/public/agreements/${encodeURIComponent(agreement.id)}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (response.ok) {
        setAgreement((cur) => (cur ? { ...cur, viewer_following: true, followers_count: (cur.followers_count ?? 0) + 1 } : cur));
        const url = new URL(window.location.href);
        url.searchParams.delete("follow");
        window.history.replaceState({}, "", url.toString());
      }
    };

    void run();
  }, [agreement?.id, agreement?.viewer_following, searchParams]);

  const handleToggleFollow = async () => {
    if (!agreement || followState === "saving") return;
    if (!supabaseOptional) return;
    const session = (await supabaseOptional.auth.getSession()).data.session;
    if (!session?.access_token) {
      const nextPath = `${window.location.pathname}${window.location.search || ""}`;
      window.location.assign(localizePath(`/login?next=${encodeURIComponent(nextPath + (nextPath.includes("?") ? "&" : "?") + "follow=1")}`, locale));
      return;
    }

    setFollowState("saving");
    const following = Boolean(agreement.viewer_following);
    const response = await fetch(`/api/public/agreements/${encodeURIComponent(agreement.id)}/follow`, {
      method: following ? "DELETE" : "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.ok) {
      setAgreement((cur) => (cur ? { ...cur, viewer_following: !following, followers_count: Math.max(0, (cur.followers_count ?? 0) + (following ? -1 : 1)) } : cur));
      setFollowState("idle");
      return;
    }
    setFollowState("error");
  };

  const handleCopy = async () => {
    const url = publicUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2400);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070a12] px-4 py-12 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-white/70">
          {t("publicAgreement.loading")}
        </div>
      </main>
    );
  }

  if (!agreement) {
    return (
      <main className="min-h-screen bg-[#070a12] px-4 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-white/40" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-semibold">{t("publicAgreement.notPublicTitle")}</h1>
          <p className="mt-3 text-sm text-white/60">{error ?? t("publicAgreement.errors.notPublic")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.13),_transparent_34rem),#070a12] px-4 py-8 text-white sm:py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30">
          <div className="border-b border-white/10 bg-black/20 p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <StatusPill
                    label={t(`publicAgreement.status.${agreement.uiStatus}`)}
                    tone={statusToneMap[agreement.uiStatus] ?? "neutral"}
                    icon={statusIconMap[agreement.uiStatus] ?? "clock"}
                    marker="icon"
                  />
                  {agreement.is_important ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/10 px-2.5 py-1.5 text-[13px] font-medium text-amber-100">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("publicAgreement.reputationStake")}
                    </span>
                  ) : null}
                </div>
                <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
                  {agreement.title}
                </h1>
                {dueText ? (
                  <p className="mt-4 text-sm font-medium text-white/70">
                    {t("publicAgreement.deadline", { date: dueText })}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-end justify-end gap-2 sm:max-w-[22rem]">
                <Tooltip
                  label={
                    copyState === "copied"
                      ? t("publicAgreement.copied")
                      : copyState === "error"
                        ? t("publicAgreement.copyFailed")
                        : t("publicAgreement.copyLink")
                  }
                  placement="top"
                >
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-label={
                      copyState === "copied"
                        ? t("publicAgreement.copied")
                        : copyState === "error"
                          ? t("publicAgreement.copyFailed")
                          : t("publicAgreement.copyLink")
                    }
                    className="inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-transparent text-white transition hover:border-emerald-300/50 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.98]"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
                      {copyState === "copied" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                    </span>
                  </button>
                </Tooltip>
                {agreement.viewer_can_follow !== false ? (
                  <button
                    type="button"
                    title={agreement.viewer_following ? t("publicAgreement.unfollowHint") : undefined}
                    onClick={handleToggleFollow}
                    className={[
                      "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold leading-none transition sm:px-4 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                      agreement.viewer_following
                        ? "border border-white/15 bg-white/[0.045] text-white/70 hover:border-white/25 hover:bg-white/[0.07] hover:text-white/82"
                        : "border border-emerald-300/45 bg-emerald-300/12 text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.18)] hover:border-emerald-300/65 hover:bg-emerald-300/18",
                    ].join(" ")}
                  >
                    {agreement.viewer_following ? <Check className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    <span>{followLabel}</span>
                  </button>
                ) : (
                  <div className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/70 sm:px-4 sm:text-sm">
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    <span>{t("publicAgreement.followersCount", { count: followersCount })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                {t("publicAgreement.whatAgreed")}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-white/82">
                {agreement.details?.trim() || agreement.condition_text?.trim() || t("publicAgreement.noDetails")}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                {t("publicAgreement.participants.title")}
              </p>
              <div className="mt-5 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr] lg:grid-cols-1 xl:grid-cols-[1fr_auto_1fr]">
                <ParticipantCard
                  label={t("publicAgreement.participants.createdBy")}
                  name={creatorName}
                  href={creatorHref}
                />
                <div className="hidden h-px w-10 bg-gradient-to-r from-white/10 via-emerald-200/45 to-white/10 sm:block lg:hidden xl:block" />
                <ParticipantCard
                  label={t(isSelfResponsible ? "publicAgreement.participants.acceptedByCounterparty" : "publicAgreement.participants.acceptedBy")}
                  name={isSelfResponsible ? acceptedByName : counterpartyName}
                  href={isSelfResponsible ? acceptedByHref : counterpartyHref}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 sm:p-7">
          <h2 className="text-lg font-semibold">{t("publicAgreement.flowTitle")}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-5">
            {flowStates.map((state, index) => (
              <div key={state.key} className="relative">
                {index > 0 ? (
                  <div className="absolute -left-1.5 top-5 hidden h-px w-3 bg-white/15 sm:block" />
                ) : null}
                <div
                  className={[
                    "rounded-2xl border p-3 text-sm transition",
                    state.current && state.disputed
                      ? "border-rose-300/45 bg-rose-300/12 text-rose-50"
                      : state.complete
                        ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-50"
                        : state.current
                          ? "border-amber-300/45 bg-amber-300/10 text-amber-50"
                          : "border-white/8 bg-black/20 text-white/35",
                  ].join(" ")}
                >
                  <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full border border-current/30 text-[11px]">
                    {state.complete ? "✓" : index + 1}
                  </div>
                  {state.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">{t("publicAgreement.timeline.title")}</h2>
            {canAddUpdate ? (
              <button
                type="button"
                onClick={() => {
                  setIsUpdateFormOpen((open) => !open);
                  setUpdateSubmitState("idle");
                }}
                className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/82 transition hover:border-emerald-300/35 hover:bg-emerald-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
              >
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                {t("publicAgreement.updates.add")}
              </button>
            ) : null}
          </div>

          {shouldShowUpdatesUnavailable ? (
            <p className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] px-4 py-3 text-sm leading-6 text-amber-50/80">
              {t("publicAgreement.updates.unavailable")}
            </p>
          ) : null}

          {isUpdateFormOpen ? (
            <div className="mt-5 rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.045] p-4">
              <label className="text-sm font-semibold text-emerald-50" htmlFor="agreement-update">
                {t("publicAgreement.updates.label")}
              </label>
              <textarea
                id="agreement-update"
                value={updateContent}
                onChange={(event) => {
                  setUpdateContent(event.target.value.slice(0, 500));
                  setUpdateSubmitState("idle");
                }}
                maxLength={500}
                rows={4}
                className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-emerald-300/45 focus:ring-2 focus:ring-emerald-300/15"
                placeholder={t("publicAgreement.updates.placeholder")}
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-white/45">
                  {t("publicAgreement.updates.helper", { count: String(remainingUpdateChars) })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUpdateFormOpen(false);
                      setUpdateSubmitState("idle");
                    }}
                    className="cursor-pointer rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/65 transition hover:bg-white/10"
                  >
                    {t("publicAgreement.updates.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmitUpdate()}
                    disabled={!updateContent.trim() || updateSubmitState === "saving"}
                    className="cursor-pointer rounded-xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updateSubmitState === "saving"
                      ? t("publicAgreement.updates.saving")
                      : t("publicAgreement.updates.publish")}
                  </button>
                </div>
              </div>
              {updateSubmitState === "error" ? (
                <p className="mt-3 text-sm text-rose-200">{t("publicAgreement.updates.error")}</p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            {timeline.map((item) => (
              <div key={item.key} className="grid gap-3 sm:grid-cols-[1rem_1fr]">
                <div className="hidden justify-center sm:flex">
                  <span
                    className={[
                      "mt-1.5 h-3 w-3 rounded-full ring-4",
                      item.tone === "success"
                        ? "bg-emerald-300 ring-emerald-300/10"
                        : item.tone === "danger"
                          ? "bg-rose-300 ring-rose-300/10"
                          : item.tone === "attention"
                            ? "bg-amber-300 ring-amber-300/10"
                            : item.tone === "update"
                              ? "bg-sky-200 ring-sky-200/10"
                              : "bg-white/45 ring-white/10",
                    ].join(" ")}
                  />
                </div>
                <div
                  className={[
                    "rounded-2xl border p-4",
                    item.kind === "update"
                      ? "border-sky-200/10 bg-sky-200/[0.035]"
                      : "border-white/10 bg-black/20",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 font-medium text-white">
                        {item.kind === "update" ? (
                          <MessageSquareText className="h-4 w-4 text-sky-100/70" aria-hidden="true" />
                        ) : null}
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm text-white/55">{item.actor}</p>
                    </div>
                    <time className="text-sm text-white/50" dateTime={item.timestamp}>
                      {formatTimestamp(item.timestamp, locale)}
                    </time>
                  </div>
                  {item.description ? (
                    <p
                      className={[
                        "mt-3 whitespace-pre-wrap text-sm leading-6",
                        item.kind === "update" ? "text-white/72" : "text-white/60",
                      ].join(" ")}
                    >
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function ParticipantCard({ label, name, href }: { label: string; name: string; href?: string | null }) {
  const className = [
    "group block h-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition",
    href
      ? "cursor-pointer hover:border-emerald-300/40 hover:bg-emerald-300/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/45"
      : "",
  ].join(" ");
  const content = (
    <>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition group-hover:bg-emerald-300/15 group-hover:text-emerald-100">
        <UserRound className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white">
        <span className="truncate">{name}</span>
        {href ? <Link2 className="h-3.5 w-3.5 shrink-0 text-emerald-100/65" aria-hidden="true" /> : null}
      </p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

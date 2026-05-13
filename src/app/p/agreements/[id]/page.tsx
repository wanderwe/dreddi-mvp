"use client";

import { Check, Clipboard, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { StatusPill } from "@/app/components/ui/StatusPill";
import type { StatusPillTone } from "@/app/components/ui/StatusPill";
import { formatDueDate } from "@/lib/formatDueDate";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { isPromiseStatus } from "@/lib/promiseStatus";
import type { PromiseStatus } from "@/lib/promiseStatus";
import { getPromiseUiStatus } from "@/lib/promiseUiStatus";
import type { PromiseUiStatus } from "@/lib/promiseUiStatus";

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
  creator_display_name: string | null;
  creator_handle: string | null;
  counterparty_display_name: string | null;
  counterparty_handle: string | null;
  counterparty_contact: string | null;
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
  tone?: "success" | "danger" | "attention" | "neutral";
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
    { key: "accepted", label: t("publicAgreement.flow.accepted"), complete: Boolean(acceptedAt), current: agreement.uiStatus === "awaiting_acceptance" },
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
  labels: { creator: string; counterparty: string; system: string },
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

  useEffect(() => {
    let active = true;

    const loadAgreement = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/public/agreements/${encodeURIComponent(id)}`, {
          cache: "no-store",
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

  const timeline = agreement
    ? buildTimeline(
        agreement,
        { creator: creatorName, counterparty: counterpartyName, system: t("publicAgreement.timeline.system") },
        t
      )
    : [];

  const isAccepted = Boolean(
    agreement &&
      (agreement.invite_status === "accepted" ||
        agreement.accepted_at ||
        agreement.counterparty_accepted_at)
  );
  const flowStates = agreement ? getFlowStates(agreement, t) : [];
  const dueText = agreement?.due_at
    ? formatDueDate(agreement.due_at, locale, { includeYear: true, includeTime: true })
    : null;

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
                {!isAccepted ? (
                  <p className="mt-4 w-fit max-w-full rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50/90 sm:whitespace-nowrap">
                    {t("publicAgreement.awaitingAcceptanceNote")}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm font-semibold leading-none text-white transition hover:border-emerald-300/50 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.98]"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
                  {copyState === "copied" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                </span>
                <span className="leading-none">
                  {copyState === "copied"
                    ? t("publicAgreement.copied")
                    : copyState === "error"
                      ? t("publicAgreement.copyFailed")
                      : t("publicAgreement.copyLink")}
                </span>
              </button>
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
                <ParticipantCard label={t("publicAgreement.participants.createdBy")} name={creatorName} />
                <div className="hidden h-px w-10 bg-gradient-to-r from-white/10 via-emerald-200/45 to-white/10 sm:block lg:hidden xl:block" />
                <ParticipantCard label={t("publicAgreement.participants.acceptedBy")} name={counterpartyName} />
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
          <h2 className="text-lg font-semibold">{t("publicAgreement.timeline.title")}</h2>
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
                            : "bg-white/45 ring-white/10",
                    ].join(" ")}
                  />
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="mt-1 text-sm text-white/55">{item.actor}</p>
                    </div>
                    <time className="text-sm text-white/50" dateTime={item.timestamp}>
                      {formatTimestamp(item.timestamp, locale)}
                    </time>
                  </div>
                  {item.description ? (
                    <p className="mt-3 text-sm leading-6 text-white/60">{item.description}</p>
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

function ParticipantCard({ label, name }: { label: string; name: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80">
        <UserRound className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{name}</p>
    </div>
  );
}

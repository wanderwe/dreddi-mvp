"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDueDate } from "@/lib/formatDueDate";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/locales";
import { localizePath } from "@/lib/i18n/routing";
import { isPromiseStatus } from "@/lib/promiseStatus";
import { getPromiseUiStatus, type PromiseUiStatus } from "@/lib/promiseUiStatus";

type PublicAgreementRow = {
  id: string;
  title: string | null;
  details: string | null;
  condition_text: string | null;
  status: string | null;
  invite_status: string | null;
  created_at: string | null;
  due_at: string | null;
  accepted_at: string | null;
  counterparty_accepted_at: string | null;
  declined_at: string | null;
  ignored_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  creator_display_name: string | null;
  creator_handle: string | null;
  creator_is_public_profile?: boolean | null;
  counterparty_display_name: string | null;
  counterparty_handle: string | null;
  counterparty_is_public_profile?: boolean | null;
  followers_count?: number | null;
};

type PublicAgreement = PublicAgreementRow & {
  title: string;
  created_at: string;
  uiStatus: PromiseUiStatus;
};

// Status card styles — mirrors profile embed's emerald/amber card language
type StatusCardStyle = {
  card: string;   // border + bg
  label: string;  // small caps label color
  dot: string;    // indicator dot (+ animate-pulse for live statuses)
};

const statusCardStyles: Record<PromiseUiStatus, StatusCardStyle> = {
  confirmed: {
    card: "border-emerald-500/15 bg-emerald-500/10",
    label: "text-emerald-200",
    dot: "bg-emerald-400",
  },
  // active = "attention" tone in the product → amber, same as the status flow step
  active: {
    card: "border-amber-400/20 bg-amber-400/10",
    label: "text-amber-200",
    dot: "bg-amber-400 animate-pulse",
  },
  completed_by_promisor: {
    card: "border-amber-400/20 bg-amber-400/10",
    label: "text-amber-200",
    dot: "bg-amber-400 animate-pulse",
  },
  // disputed = "danger" tone → red
  disputed: {
    card: "border-red-500/15 bg-red-500/10",
    label: "text-red-300",
    dot: "bg-red-400",
  },
  declined: {
    card: "border-red-500/15 bg-red-500/10",
    label: "text-red-300",
    dot: "bg-red-400",
  },
  awaiting_acceptance: {
    card: "border-white/10 bg-black/30",
    label: "text-white/55",
    dot: "bg-white/30",
  },
  expired: {
    card: "border-white/8 bg-black/20",
    label: "text-white/40",
    dot: "bg-white/20",
  },
  cancelled_by_creator: {
    card: "border-white/8 bg-black/20",
    label: "text-white/40",
    dot: "bg-white/20",
  },
};

function normalizeAgreement(row: PublicAgreementRow): PublicAgreement | null {
  const { status } = row;
  if (!row.title || !row.created_at || !isPromiseStatus(status)) return null;
  return {
    ...row,
    title: row.title,
    created_at: row.created_at,
    uiStatus: getPromiseUiStatus({ ...row, status }),
  };
}

function getPublicProfileHref(
  handle: string | null,
  isPublicProfile: boolean | null | undefined,
  locale: Locale
) {
  const h = handle?.trim();
  if (!h || !isPublicProfile) return null;
  return localizePath(`/u/${h}`, locale);
}

function participantLabel(name: string | null, handle: string | null): string | null {
  if (name?.trim()) return name.trim();
  if (handle?.trim()) return `@${handle.trim()}`;
  return null;
}

export default function EmbedAgreementPage() {
  const t = useT();
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const [agreement, setAgreement] = useState<PublicAgreement | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty">("loading");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  // Neutralise globals.css body styles for iframe context:
  // — transparent background (widget card provides its own bg)
  // — overflow:hidden on body prevents any scroll inside the iframe
  //   (safe now that height is fixed at 380px; does NOT affect
  //    getBoundingClientRect used by postHeight)
  useEffect(() => {
    const { documentElement: html, body } = document;
    html.style.background = "transparent";
    body.style.background = "transparent";
    body.style.minHeight = "auto";
    body.style.overflow = "hidden";
    return () => {
      html.style.background = "";
      body.style.background = "";
      body.style.minHeight = "";
      body.style.overflow = "";
    };
  }, []);

  // Auto-resize for iframe embedding.
  // Measure <main> after the browser has painted (double-RAF) so fonts and
  // layout are stable. body/html expand to viewport height in iframes, so
  // we measure the content element directly.
  useEffect(() => {
    const postHeight = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const main = document.querySelector("main");
          const height = main
            ? Math.ceil(main.getBoundingClientRect().height)
            : Math.ceil(document.body.scrollHeight);
          window.parent.postMessage({ type: "dreddi:embed:resize", height }, "*");
        });
      });
    };
    postHeight();
    window.addEventListener("load", postHeight);
    window.addEventListener("resize", postHeight);
    const main = document.querySelector("main");
    const ro = new ResizeObserver(postHeight);
    if (main) ro.observe(main); else ro.observe(document.body);
    return () => {
      window.removeEventListener("load", postHeight);
      window.removeEventListener("resize", postHeight);
      ro.disconnect();
    };
  }, [loadState]);

  useEffect(() => {
    if (!id) return setLoadState("empty");
    let active = true;
    const load = async () => {
      setLoadState("loading");
      try {
        const res = await fetch(`/api/public/agreements/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        if (!active) return;
        if (!res.ok) return setLoadState("empty");
        const normalized = normalizeAgreement((await res.json()) as PublicAgreementRow);
        setAgreement(normalized);
        setLoadState(normalized ? "ready" : "empty");
      } catch {
        if (active) setLoadState("empty");
      }
    };
    void load();
    return () => { active = false; };
  }, [id]);

  if (loadState !== "ready" || !agreement) {
    return (
      <main className="w-full bg-transparent text-white">
        <section className="w-full max-w-[480px] h-[380px] rounded-3xl border border-white/10 bg-[#0b0f1a]/95 p-4 shadow-2xl shadow-black/40 flex flex-col gap-3">
          {loadState === "loading" ? (
            <>
              <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2 animate-pulse">
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/8" />
                <div className="h-3 w-2/3 rounded bg-white/8 mt-2" />
              </div>
              <div className="grid grid-cols-2 gap-3 animate-pulse">
                <div className="rounded-2xl border border-white/10 bg-white/5 h-16" />
                <div className="rounded-2xl border border-white/10 bg-white/5 h-16" />
              </div>
            </>
          ) : (
            <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-6 flex items-center justify-center text-xs text-white/50">
              {t("agreementEmbed.unavailable")}
            </div>
          )}
        </section>
      </main>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const cardStyle = statusCardStyles[agreement.uiStatus];
  const statusLabel = t(`publicAgreement.status.${agreement.uiStatus}`);
  const agreementPath = localizePath(`/p/agreements/${agreement.id}`, locale);
  const agreementUrl = origin ? `${origin}${agreementPath}` : agreementPath;

  const details = agreement.details?.trim() || agreement.condition_text?.trim();
  const deadlineLabel = agreement.due_at
    ? formatDueDate(agreement.due_at, locale, { includeYear: true })
    : null;
  const watchersCount = Math.max(0, agreement.followers_count ?? 0);

  const creatorLabel = participantLabel(agreement.creator_display_name, agreement.creator_handle);
  // Show real name/handle if known; fall back to placeholder when counterparty
  // hasn't accepted yet — widget updates automatically on next load when they do
  // Always show both sides — fall back to placeholder if counterparty unknown/pending
  const counterpartyLabel =
    participantLabel(agreement.counterparty_display_name, agreement.counterparty_handle) ??
    t("publicAgreement.participants.counterpartyFallback");
  const creatorHref = getPublicProfileHref(agreement.creator_handle, agreement.creator_is_public_profile, locale);
  const counterpartyHref = getPublicProfileHref(agreement.counterparty_handle, agreement.counterparty_is_public_profile, locale);
  const showParticipants = Boolean(creatorLabel || counterpartyLabel);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="w-full bg-transparent text-white">
      {/* Fixed 380px — stat cards always at bottom, header card sized to content */}
      <section className="w-full max-w-[480px] h-[380px] rounded-3xl border border-white/10 bg-[#0b0f1a]/95 p-4 shadow-2xl shadow-black/40 flex flex-col">

          {/* ── Header card — content-sized, caps at max-h so all stat rows fit ── */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4" style={{maxHeight: "168px"}}>
            <h1 className="line-clamp-3 text-[16px] font-semibold leading-snug text-white">
              {agreement.title}
            </h1>
            {details ? (
              <p className="mt-1 line-clamp-2 text-xs text-white/45">{details}</p>
            ) : null}

            {/* Brand label */}
            <p className="mt-2 text-[11px] uppercase tracking-[0.15em] text-emerald-100/65">
              {t("agreementEmbed.badge")} · Dreddi
            </p>
          </div>

          {/* Spacer — absorbs leftover space transparently between header and stat rows */}
          <div className="flex-1" />

          {/* ── Stat cards — 2×2 grid ── */}
          <div className="mt-2 grid grid-cols-2 gap-2">

            {/* Deadline */}
            <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/55">
                {t("agreementEmbed.deadline")}
              </p>
              <p className="mt-1.5 truncate text-sm font-semibold leading-tight text-white">
                {deadlineLabel ?? t("agreementEmbed.noDeadline")}
              </p>
            </div>

            {/* Responsible party */}
            <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
              <p className="truncate text-[10px] uppercase tracking-[0.05em] text-white/55">
                {t("agreementEmbed.party")}
              </p>
              {counterpartyHref ? (
                <a
                  href={counterpartyHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-white transition hover:text-emerald-300"
                >
                  <span className="truncate">{counterpartyLabel}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                </a>
              ) : (
                <p className="mt-1.5 truncate text-sm font-semibold leading-tight text-white">
                  {counterpartyLabel}
                </p>
              )}
            </div>

            {/* Status — color-coded */}
            <div className={`rounded-2xl border px-3 py-2 ${cardStyle.card}`}>
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cardStyle.dot}`} />
                <p className={`text-[10px] uppercase tracking-[0.15em] ${cardStyle.label}`}>
                  {t("agreementEmbed.status")}
                </p>
              </div>
              <p className="mt-1.5 truncate text-sm font-semibold leading-tight text-white">
                {statusLabel}
              </p>
            </div>

            {/* Watching */}
            <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/55">
                {t("agreementEmbed.watching")}
              </p>
              <p className="mt-1.5 text-xl font-semibold text-white">
                {watchersCount}
              </p>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="mt-2 flex items-center justify-between px-1">
            <p className="text-xs text-white/40">
              {t("publicProfile.embed.poweredBy")}
            </p>
            <a
              href={agreementUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-white/35 transition hover:text-white/70"
            >
              {t("agreementEmbed.cta")} <ExternalLink className="h-3 w-3" />
            </a>
          </div>

      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { ArrowUpRight, Dot } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/app/components/ui/StatusPill";
import type { StatusPillTone } from "@/app/components/ui/StatusPill";
import { formatDueDate } from "@/lib/formatDueDate";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/locales";
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
  updated_at?: string | null;
};

type PublicAgreement = PublicAgreementRow & { title: string; created_at: string; uiStatus: PromiseUiStatus };

const statusToneMap: Record<PromiseUiStatus, StatusPillTone> = {
  active: "attention",
  completed_by_promisor: "attention",
  confirmed: "success",
  disputed: "danger",
  awaiting_acceptance: "neutral",
  declined: "danger",
  expired: "neutral",
  cancelled_by_creator: "danger",
};

function normalizeAgreement(row: PublicAgreementRow): PublicAgreement | null {
  if (!row.title || !row.created_at || !isPromiseStatus(row.status)) return null;
  return { ...row, title: row.title, created_at: row.created_at, uiStatus: getPromiseUiStatus(row) };
}

function getPublicProfileHref(handle: string | null, isPublicProfile: boolean | null | undefined, locale: Locale) {
  const cleanHandle = handle?.trim();
  if (!cleanHandle || !isPublicProfile) return null;
  return localizePath(`/u/${cleanHandle}`, locale);
}

function displayName(name: string | null, handle: string | null, fallback: string) {
  if (name?.trim()) return name.trim();
  if (handle?.trim()) return `@${handle.trim()}`;
  return fallback;
}

const flowKeys = ["created", "accepted", "active", "confirmed"] as const;

export default function EmbedAgreementPage() {
  const t = useT();
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const theme = searchParams.get("theme") === "light" ? "light" : "dark";
  const [agreement, setAgreement] = useState<PublicAgreement | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    if (!id) return setLoadState("empty");
    let active = true;
    const load = async () => {
      setLoadState("loading");
      const res = await fetch(`/api/public/agreements/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!active) return;
      if (!res.ok) return setLoadState("empty");
      const normalized = normalizeAgreement((await res.json()) as PublicAgreementRow);
      setAgreement(normalized);
      setLoadState(normalized ? "ready" : "empty");
    };
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const themeClass = useMemo(
    () =>
      theme === "light"
        ? "border-slate-200 bg-white text-slate-900"
        : "border-white/10 bg-slate-950 text-slate-100",
    [theme]
  );

  const chipClass = theme === "light" ? "border-slate-200 bg-slate-50/90" : "border-white/10 bg-white/5";

  if (loadState !== "ready" || !agreement) {
    return (
      <main className="m-0 p-1">
        <div className={`w-full rounded-xl border px-4 py-4 text-sm ${themeClass}`}>{t("agreementEmbed.unavailable")}</div>
      </main>
    );
  }

  const creator = displayName(agreement.creator_display_name, agreement.creator_handle, t("publicAgreement.participants.creatorFallback"));
  const counterparty = displayName(agreement.counterparty_display_name, agreement.counterparty_handle, t("publicAgreement.participants.counterpartyFallback"));
  const details = agreement.details?.trim() || agreement.condition_text?.trim();
  const updatedAt = agreement.updated_at || agreement.created_at;
  const creatorHref = getPublicProfileHref(agreement.creator_handle, agreement.creator_is_public_profile, locale);
  const counterpartyHref = getPublicProfileHref(agreement.counterparty_handle, agreement.counterparty_is_public_profile, locale);
  const hasAccepted = Boolean(agreement.accepted_at ?? agreement.counterparty_accepted_at);
  const isConfirmed = agreement.uiStatus === "confirmed";
  const isDisputed = agreement.uiStatus === "disputed";

  return (
    <main className="m-0 p-1">
      <article className={`mx-auto w-full max-w-2xl rounded-2xl border p-3.5 shadow-sm ${themeClass}`}>
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="inline-flex items-center gap-1.5 font-semibold tracking-wide opacity-85">
            <Dot className="h-4 w-4" />Dreddi
          </div>
          <div className="inline-flex items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 ${chipClass}`}>{t("agreementEmbed.badge")}</span>
            <span className="opacity-65">{t("agreementEmbed.updated")} {new Date(updatedAt).toLocaleDateString(locale)}</span>
          </div>
        </div>

        <h1 className="mt-2 text-[15px] font-semibold leading-tight sm:text-base">{agreement.title}</h1>
        {details ? <p className="mt-1 line-clamp-2 text-[12px] opacity-80">{details}</p> : null}
        <p className="mt-2 flex flex-wrap items-center gap-1 text-[12px] opacity-90">
          {creatorHref ? <Link href={creatorHref} className="underline-offset-2 transition hover:underline">{creator}</Link> : <span>{creator}</span>}
          <span className="opacity-60">↔</span>
          {counterpartyHref ? <Link href={counterpartyHref} className="underline-offset-2 transition hover:underline">{counterparty}</Link> : <span>{counterparty}</span>}
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          <StatusPill label={t(`publicAgreement.status.${agreement.uiStatus}`)} tone={statusToneMap[agreement.uiStatus] ?? "neutral"} icon="clock" />
          {agreement.due_at ? <span className={`rounded-full border px-2 py-1 ${chipClass}`}>{t("agreementEmbed.deadline")}: {formatDueDate(agreement.due_at, locale, { includeYear: true })}</span> : null}
          <span className={`rounded-full border px-2 py-1 ${chipClass}`}>{Math.max(0, agreement.followers_count ?? 0)} {t("agreementEmbed.watching")}</span>
        </div>

        <div className="mt-2.5 rounded-lg border border-white/10 px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            {flowKeys.map((key, index) => {
              const complete = key === "created" || (key === "accepted" && hasAccepted) || (key === "active" && hasAccepted);
              const current = (key === "active" && !isConfirmed && !isDisputed) || (key === "confirmed" && (isConfirmed || isDisputed));
              const isLast = index === flowKeys.length - 1;
              const dotTone = isLast
                ? isDisputed
                  ? "bg-red-400"
                  : isConfirmed
                    ? "bg-emerald-400"
                    : "bg-white/35"
                : complete
                  ? "bg-amber-300"
                  : "bg-white/25";
              return (
                <div key={key} className="flex min-w-0 flex-1 items-center gap-1.5">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${dotTone} ${current ? "ring-2 ring-amber-300/40" : ""}`} />
                  <span className={`truncate text-[10px] ${complete || current ? "opacity-90" : "opacity-55"}`}>
                    {isLast && isDisputed ? t("publicAgreement.status.disputed") : t(`publicAgreement.flow.${key}`)}
                  </span>
                  {!isLast ? <div className="h-px flex-1 bg-white/15" /> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] opacity-70">{t("agreementEmbed.liveNote")}</p>
          <Link
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition hover:opacity-85 ${chipClass}`}
            href={localizePath(`/p/agreements/${agreement.id}`, locale)}
          >
            {t("agreementEmbed.cta")}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </main>
  );
}

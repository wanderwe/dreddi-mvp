"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/app/components/ui/StatusPill";
import type { StatusPillTone } from "@/app/components/ui/StatusPill";
import { formatDueDate } from "@/lib/formatDueDate";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { isPromiseStatus } from "@/lib/promiseStatus";
import { getPromiseUiStatus, type PromiseUiStatus } from "@/lib/promiseUiStatus";

// aligned with public agreement page shape

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
  counterparty_display_name: string | null;
  counterparty_handle: string | null;
  counterparty_contact: string | null;
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
  return {
    ...row,
    title: row.title,
    created_at: row.created_at,
    uiStatus: getPromiseUiStatus(row),
  };
}

function displayName(name: string | null, handle: string | null, fallback: string) {
  if (name?.trim()) return name.trim();
  if (handle?.trim()) return `@${handle.trim()}`;
  return fallback;
}

export default function EmbedAgreementPage() {
  const t = useT();
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const themeParam = searchParams.get("theme");
  const theme = themeParam === "light" ? "light" : "dark";
  const [agreement, setAgreement] = useState<PublicAgreement | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    if (!id) {
      setLoadState("empty");
      return;
    }

    let active = true;
    const load = async () => {
      setLoadState("loading");
      const res = await fetch(`/api/public/agreements/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!active) return;
      if (!res.ok) {
        setAgreement(null);
        setLoadState("empty");
        return;
      }
      const data = (await res.json()) as PublicAgreementRow;
      const normalized = normalizeAgreement(data);
      setAgreement(normalized);
      setLoadState(normalized ? "ready" : "empty");
    };

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const cardClass = useMemo(
    () =>
      theme === "light"
        ? "border-slate-200 bg-white text-slate-900"
        : "border-white/10 bg-slate-950 text-slate-100",
    [theme]
  );

  if (loadState !== "ready" || !agreement) {
    return <main className="m-0 min-h-screen p-3"><div className={`rounded-2xl border p-5 ${cardClass}`}>{t("agreementEmbed.unavailable")}</div></main>;
  }

  const creator = displayName(agreement.creator_display_name, agreement.creator_handle, t("publicAgreement.participants.creatorFallback"));
  const counterparty = displayName(agreement.counterparty_display_name, agreement.counterparty_handle, t("publicAgreement.participants.counterpartyFallback"));
  const details = agreement.details?.trim() || agreement.condition_text?.trim();
  const updatedAt = agreement.updated_at || agreement.created_at;

  return (
    <main className="m-0 min-h-screen p-3">
      <article className={`mx-auto w-full max-w-2xl rounded-2xl border p-4 shadow-sm ${cardClass}`}>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold tracking-wide">Dreddi</span>
          <span className="rounded-full border px-2 py-1">{t("agreementEmbed.badge")}</span>
        </div>
        <h1 className="mt-3 text-base font-semibold leading-snug sm:text-lg">{agreement.title}</h1>
        {details ? <p className="mt-2 line-clamp-3 text-sm opacity-80">{details}</p> : null}
        <p className="mt-3 text-sm opacity-80">{creator} ↔ {counterparty}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span>{t("agreementEmbed.status")}:</span>
          <StatusPill label={t(`publicAgreement.status.${agreement.uiStatus}`)} tone={statusToneMap[agreement.uiStatus] ?? "neutral"} icon="clock" />
          {agreement.due_at ? <span className="opacity-80">{t("agreementEmbed.deadline")}: {formatDueDate(agreement.due_at, locale, { includeYear: true })}</span> : null}
          <span className="opacity-80">{Math.max(0, agreement.followers_count ?? 0)} {t("agreementEmbed.watching")}</span>
          <span className="opacity-70">• {new Date(updatedAt).toLocaleDateString(locale)}</span>
        </div>
        <div className="mt-4">
          <Link className="inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition hover:opacity-85" href={localizePath(`/p/agreements/${agreement.id}`, locale)}>
            {t("agreementEmbed.cta")}
          </Link>
        </div>
      </article>
    </main>
  );
}

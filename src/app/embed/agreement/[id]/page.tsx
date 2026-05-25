"use client";

import Link from "next/link";
import { ArrowUpRight, Dot } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/app/components/ui/StatusPill";
import type { StatusPillTone } from "@/app/components/ui/StatusPill";
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

  const cardClass = useMemo(
    () =>
      theme === "light"
        ? "border-slate-200 bg-white text-slate-900"
        : "border-white/10 bg-slate-950 text-slate-100",
    [theme]
  );

  const chipClass = theme === "light" ? "border-slate-200 bg-slate-50/90" : "border-white/10 bg-white/5";

  if (loadState !== "ready" || !agreement) {
    return (
      <main className="m-0 p-1.5">
        <div className={`mx-auto w-full max-w-xl rounded-2xl border px-4 py-4 text-sm ${cardClass}`}>
          {t("agreementEmbed.unavailable")}
        </div>
      </main>
    );
  }

  const creator = displayName(
    agreement.creator_display_name,
    agreement.creator_handle,
    t("publicAgreement.participants.creatorFallback")
  );
  const counterparty = displayName(
    agreement.counterparty_display_name,
    agreement.counterparty_handle,
    t("publicAgreement.participants.counterpartyFallback")
  );
  const creatorHref = getPublicProfileHref(agreement.creator_handle, agreement.creator_is_public_profile, locale);
  const counterpartyHref = getPublicProfileHref(
    agreement.counterparty_handle,
    agreement.counterparty_is_public_profile,
    locale
  );
  const details = agreement.details?.trim() || agreement.condition_text?.trim();

  return (
    <main className="m-0 p-1.5">
      <article className={`mx-auto w-full max-w-xl rounded-2xl border p-4 shadow-sm ${cardClass}`}>
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 font-semibold tracking-wide opacity-80">
            <Dot className="h-4 w-4" aria-hidden="true" />
            Dreddi
          </span>
          <span className={`rounded-full border px-2 py-0.5 ${chipClass}`}>{t("agreementEmbed.badge")}</span>
        </div>

        <h1 className="mt-2 line-clamp-2 text-[16px] font-semibold leading-tight sm:text-[17px]">{agreement.title}</h1>

        {details ? <p className="mt-1 line-clamp-1 text-[12px] opacity-75">{details}</p> : null}

        <div className="mt-2.5 flex items-center gap-1 text-[12px] opacity-90">
          {creatorHref ? (
            <Link href={creatorHref} className="truncate underline-offset-2 transition hover:underline">
              {creator}
            </Link>
          ) : (
            <span className="truncate">{creator}</span>
          )}
          <span className="opacity-60">↔</span>
          {counterpartyHref ? (
            <Link href={counterpartyHref} className="truncate underline-offset-2 transition hover:underline">
              {counterparty}
            </Link>
          ) : (
            <span className="truncate">{counterparty}</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <StatusPill
            label={t(`publicAgreement.status.${agreement.uiStatus}`).toUpperCase()}
            tone={statusToneMap[agreement.uiStatus] ?? "neutral"}
            icon="clock"
          />
          {agreement.due_at ? (
            <span className={`rounded-full border px-2 py-1 ${chipClass}`}>
              {t("agreementEmbed.deadline")}: {formatDueDate(agreement.due_at, locale, { includeYear: true })}
            </span>
          ) : null}
          <span className={`rounded-full border px-2 py-1 ${chipClass}`}>
            {Math.max(0, agreement.followers_count ?? 0)} {t("agreementEmbed.watching")}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] opacity-65">{t("agreementEmbed.liveNote")}</p>
          <Link
            href={localizePath(`/p/agreements/${agreement.id}`, locale)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition hover:opacity-85 ${chipClass}`}
          >
            {t("agreementEmbed.cta")}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </main>
  );
}

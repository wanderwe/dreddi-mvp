"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";
import { formatDueDate } from "@/lib/formatDueDate";
import {
  canCounterpartyRespond,
  getPromiseInviteStatus,
  isPromiseAccepted,
  InviteStatus,
} from "@/lib/promiseAcceptance";
import { getPromiseLabels } from "@/lib/promiseLabels";

type InviteInfo = {
  id: string;
  title: string;
  details: string | null;
  condition_text: string | null;
  condition_met_at: string | null;
  due_at: string | null;
  creator_handle: string | null;
  creator_display_name: string | null;
  creator_id: string;
  counterparty_id: string | null;
  counterparty_display_name: string | null;
  counterparty_accepted_at: string | null;
  invite_status: InviteStatus | null;
  invited_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  ignored_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  counterparty_contact: string | null;
  visibility: "private" | "public";
  promisor_id: string | null;
  promisee_id: string | null;
};

export default function InvitePage() {
  const t = useT();
  const locale = useLocale();
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const router = useRouter();
  const searchParams = useSearchParams();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [autoAcceptAttempted, setAutoAcceptAttempted] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const promiseLabels = useMemo(() => getPromiseLabels(t), [t]);

  async function load() {
    if (!token) return;

    setError(null);

    // просто перевіряємо чи є сесія (для UI)
    if (!supabase) {
      setSignedIn(false);
      setUserId(null);
    } else {
      const { data: s } = await supabase.auth.getSession();
      setSignedIn(Boolean(s.session));
      setUserId(s.session?.user?.id ?? null);
    }

    // Дістаємо дані інвайту через API (server-side safe)
    const res = await fetch(`/api/invite/${token}`, { cache: "no-store" });
    const j = await res.json();

    if (!res.ok) {
      setError(j?.error ?? t("invite.errors.notFound"));
      setInfo(null);
      return;
    }

    setInfo(j as InviteInfo);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const shouldAutoAccept = searchParams.get("accept") === "1";
    if (!shouldAutoAccept || autoAcceptAttempted) return;
    if (!signedIn || !info) return;

    const inviteStatus = getPromiseInviteStatus(info);

    if (inviteStatus === "accepted" && info.counterparty_id && userId === info.counterparty_id) {
      setAutoAcceptAttempted(true);
      router.push(localizePath("/promises", locale));
      return;
    }

    if (inviteStatus === "awaiting_acceptance") {
      setAutoAcceptAttempted(true);
      if (info.visibility === "public") {
        setShowAcceptModal(true);
        return;
      }
      void accept();
    }
  }, [autoAcceptAttempted, info, router, searchParams, signedIn, userId]);

  async function accept() {
    if (!token) return;

    setBusy(true);
    setError(null);

    if (!supabase) {
      setBusy(false);
      setError("Authentication is unavailable in this preview.");
      return;
    }

    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      // відправляємо на логін і повертаємо назад сюди
      const nextPath = localizePath(`/p/invite/${token}?accept=1`, locale);
      router.push(localizeLoginPath(nextPath, locale));
      setBusy(false);
      return;
    }

    const accessToken = s.session.access_token;

    const res = await fetch(`/api/invite/${token}/accept`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const j = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(j?.error ?? t("invite.errors.acceptFailed"));
      return;
    }

    // успіх: перезавантажимо дані і перекинемо на promises
    await load();
    router.push(localizePath("/promises", locale));
  }

  async function decline() {
    if (!token) return;

    setBusy(true);
    setError(null);

    if (!supabase) {
      setBusy(false);
      setError("Authentication is unavailable in this preview.");
      return;
    }

    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      const nextPath = localizePath(`/p/invite/${token}`, locale);
      router.push(localizeLoginPath(nextPath, locale));
      setBusy(false);
      return;
    }

    const accessToken = s.session.access_token;

    const res = await fetch(`/api/invite/${token}/decline`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const j = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(j?.error ?? t("invite.errors.declineFailed"));
      return;
    }

    await load();
  }

  const inviteRole = useMemo<"executor" | "receiver">(() => {
    if (!info) return "receiver";
    const creatorIsPromisee = info.promisee_id === info.creator_id;
    const creatorIsPromisor = info.promisor_id === info.creator_id;

    if (creatorIsPromisee && !info.promisor_id) return "executor";
    if (creatorIsPromisor && !info.promisee_id) return "receiver";

    return "receiver";
  }, [info]);

  const roleLine = useMemo(() => {
    if (inviteRole === "executor") {
      return t("invite.roleLine.executor");
    }

    return t("invite.roleLine.receiver");
  }, [inviteRole, t]);

  const dueParts = useMemo(() => {
    if (!info?.due_at) return null;
    try {
      const date = new Date(info.due_at);
      if (Number.isNaN(date.getTime())) {
        return { dateText: info.due_at, timeText: "" };
      }
      const dateText =
        formatDueDate(info.due_at, locale, { includeYear: true, includeTime: false }) ??
        info.due_at;
      const timeText = new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
      return { dateText, timeText };
    } catch {
      return { dateText: info.due_at, timeText: "" };
    }
  }, [info?.due_at, locale]);

  const inviteStatus = getPromiseInviteStatus(info);
  const inviteAccepted = isPromiseAccepted(info);
  const creatorName = useMemo(() => {
    if (!info) return t("invite.unknown");
    const displayName = info.creator_display_name?.trim();
    if (displayName) return displayName;
    return info.creator_handle ? `@${info.creator_handle}` : t("invite.unknown");
  }, [info, t]);
  const invitedSideName = useMemo(() => {
    if (!info?.counterparty_id) return t("invite.invitedSidePending");
    const displayName = info.counterparty_display_name?.trim();
    if (displayName) return displayName;
    return info.counterparty_id.slice(0, 8);
  }, [info, t]);
  const isCreatorViewer = Boolean(info?.creator_id && userId && info.creator_id === userId);
  const isAcceptedInviteeViewer = Boolean(
    inviteAccepted && info?.counterparty_id && userId && info.counterparty_id === userId
  );
  const heading = inviteAccepted
    ? isAcceptedInviteeViewer
      ? t("invite.heading.acceptedByYou")
      : t("invite.heading.accepted")
    : t("invite.heading.pending");
  const openDealLabel = isCreatorViewer ? t("invite.viewDeal") : t("invite.goToDeal");
  const detailsText = info?.details?.trim() ?? "";
  const hasDetails = detailsText.length > 0;
  const canDecline = canCounterpartyRespond({
    userId,
    creatorId: info?.creator_id ?? "",
    counterpartyId: info?.counterparty_id ?? null,
    inviteStatus,
  });
  const canAccept =
    inviteStatus === "awaiting_acceptance" &&
    (!userId ||
      (info?.creator_id !== userId &&
        (!info?.counterparty_id || info.counterparty_id === userId)));

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 25%, rgba(52, 211, 153, 0.12), transparent 32%)," +
            "radial-gradient(circle at 80% 10%, rgba(99, 102, 241, 0.12), transparent 28%)," +
            "radial-gradient(circle at 50% 70%, rgba(248, 113, 113, 0.08), transparent 35%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 py-12 space-y-8">
        <div className="flex items-center justify-end gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            {signedIn ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden /> {t("invite.signedIn")}
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-300" aria-hidden /> {t("invite.guestMode")}
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100 shadow-inner shadow-black/30">
            {error}
          </div>
        )}

        {!info && !error && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        )}

        {info && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-7">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">{t("invite.eyebrow")}</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
              {heading}
            </h1>

            <h2 className="mt-4 text-2xl font-semibold text-white">{info.title}</h2>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-slate-200">
                <span className="mr-2" aria-hidden>
                  ⏰
                </span>
                {t("invite.deadline")}:{" "}
                <span className="ml-1 font-semibold text-white">
                  {dueParts
                    ? `${dueParts.dateText}${dueParts.timeText ? `, ${dueParts.timeText}` : ""}`
                    : t("invite.noDeadline")}
                </span>
              </span>
              {info.visibility === "public" && (
                <span className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 font-semibold uppercase tracking-[0.08em] text-amber-100">
                  {t("invite.publicTag")}
                </span>
              )}
            </div>

            <dl className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">{t("invite.createdByLabel")}</dt>
                <dd className="mt-1 font-medium text-white">{creatorName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">{t("invite.invitedSideLabel")}</dt>
                <dd className="mt-1 font-medium text-white">{invitedSideName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">{t("invite.roleLine.label")}</dt>
                <dd className="mt-1 font-medium text-white">{roleLine}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">{t("invite.statusLabel")}</dt>
                <dd className="mt-1 font-medium text-white">{t(`invite.status.${inviteStatus}`)}</dd>
              </div>
              {inviteAccepted && (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">{t("invite.acceptedByLabel")}</dt>
                  <dd className="mt-1 font-medium text-white">{invitedSideName}</dd>
                </div>
              )}
            </dl>

            {hasDetails && (
              <section className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-xs uppercase tracking-[0.14em] text-slate-400">
                  {t("invite.dealDetailsLabel")}
                </h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">
                  {detailsText}
                </p>
              </section>
            )}

            <div className="mt-6">
              {inviteAccepted ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 sm:flex-1">
                    {isAcceptedInviteeViewer
                      ? t("invite.acceptedStateMessageYou")
                      : t("invite.acceptedStateMessage")}
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(localizePath(`/promises/${info.id}`, locale))}
                    className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/40 sm:shrink-0"
                  >
                    {openDealLabel}
                  </button>
                </div>
              ) : canAccept ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (info.visibility === "public") {
                        setShowAcceptModal(true);
                      } else {
                        void accept();
                      }
                    }}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
                  >
                    {busy ? t("invite.processing") : t("invite.acceptDeal")}
                  </button>
                  {canDecline && (
                    <button
                      disabled={busy}
                      onClick={() => void decline()}
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? t("invite.processing") : t("invite.decline")}
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300">
                  {inviteStatus === "declined"
                    ? t("invite.declinedMessage")
                    : inviteStatus === "expired"
                    ? t("invite.ignoredMessage")
                    : inviteStatus === "cancelled_by_creator"
                    ? t("invite.withdrawnMessage")
                    : t("invite.awaitingCounterparty")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAcceptModal && info && !inviteAccepted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">
              {t("invite.publicModal.title", { entityLower: promiseLabels.entityLower })}
            </h2>
            <p className="mt-3 text-sm text-neutral-200">
              {t("invite.publicModal.body", { entityLower: promiseLabels.entityLower })}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                {t("invite.publicModal.cancel")}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowAcceptModal(false);
                  await accept();
                }}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                {t("invite.publicModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

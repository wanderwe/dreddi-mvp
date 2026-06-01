"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";
import { formatDueDate } from "@/lib/formatDueDate";
import { Tooltip } from "@/app/components/ui/Tooltip";
import {
  getPromiseInviteStatus,
  isPromiseAccepted,
  InviteStatus,
} from "@/lib/promiseAcceptance";
import { getPromiseLabels } from "@/lib/promiseLabels";

type InviteInfo = {
  id: string;
  title: string;
  is_important: boolean;
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

type ConditionChoice = "accept" | "edit" | "add" | null;

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
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error">("success");

  // Condition negotiation state
  const [conditionChoice, setConditionChoice] = useState<ConditionChoice>(null);
  const [conditionEditText, setConditionEditText] = useState("");

  const promiseLabels = useMemo(() => getPromiseLabels(t), [t]);

  async function load() {
    if (!token) return;

    setError(null);

    if (!supabase) {
      setSignedIn(false);
      setUserId(null);
    } else {
      const { data: s } = await supabase.auth.getSession();
      setSignedIn(Boolean(s.session));
      setUserId(s.session?.user?.id ?? null);
    }

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

  // Reset condition choice when info loads
  useEffect(() => {
    if (info) {
      setConditionChoice(info.condition_text ? "accept" : null);
      setConditionEditText("");
    }
  }, [info?.id]);

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

  function resolveConditionPayload(): string | undefined {
    if (!info) return undefined;
    if (info.condition_text) {
      // creator had a condition
      if (conditionChoice === "accept") return undefined; // accept as-is, no payload
      if (conditionChoice === "edit") {
        const text = conditionEditText.trim();
        return text && text !== info.condition_text.trim() ? text : undefined;
      }
      return undefined;
    } else {
      // creator had no condition
      if (conditionChoice === "add") {
        const text = conditionEditText.trim();
        return text || undefined;
      }
      return undefined;
    }
  }

  async function accept(conditionTextOverride?: string | undefined) {
    if (!token) return;

    if (!supabase) {
      setError("Authentication is unavailable in this preview.");
      return;
    }

    if (!signedIn) {
      router.push(localizeLoginPath(localizePath(`/p/invite/${token}?accept=1`, locale), locale));
      return;
    }

    setBusy(true);
    setError(null);

    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      const nextPath = localizePath(`/p/invite/${token}?accept=1`, locale);
      router.push(localizeLoginPath(nextPath, locale));
      setBusy(false);
      return;
    }

    const accessToken = s.session.access_token;

    const conditionText =
      conditionTextOverride !== undefined ? conditionTextOverride : resolveConditionPayload();

    const body: Record<string, unknown> = {};
    if (conditionText !== undefined) body.conditionText = conditionText;

    const res = await fetch(`/api/invite/${token}/accept`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const j = await res.json();
    setBusy(false);

    if (!res.ok) {
      if (res.status === 401) {
        const nextPath = localizePath(`/p/invite/${token}?accept=1`, locale);
        router.push(localizeLoginPath(nextPath, locale));
        return;
      }
      setError(j?.error ?? t("invite.errors.acceptFailed"));
      return;
    }

    await load();
    if (!j.awaitingConfirmation) {
      router.push(localizePath("/promises", locale));
    }
  }

  async function decline() {
    if (!token) return;

    if (!supabase) {
      setError("Authentication is unavailable in this preview.");
      return;
    }

    if (!signedIn) {
      router.push(localizeLoginPath(localizePath(`/p/invite/${token}`, locale), locale));
      return;
    }

    setBusy(true);
    setError(null);

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
      if (res.status === 401) {
        const nextPath = localizePath(`/p/invite/${token}`, locale);
        router.push(localizeLoginPath(nextPath, locale));
        return;
      }
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
  const isAwaitingConfirmation = inviteStatus === "awaiting_creator_confirmation";
  const isInviteeAwaitingConfirmation = Boolean(
    isAwaitingConfirmation && info?.counterparty_id && userId === info.counterparty_id
  );
  const heading = inviteAccepted
    ? isAcceptedInviteeViewer
      ? t("invite.heading.acceptedByYou")
      : t("invite.heading.accepted")
    : t("invite.heading.pending");
  const openDealLabel = isCreatorViewer ? t("invite.viewDeal") : t("invite.goToDeal");
  const detailsText = info?.details?.trim() ?? "";
  const hasDetails = detailsText.length > 0;
  const canAccept =
    inviteStatus === "awaiting_acceptance" &&
    (!userId ||
      (info?.creator_id !== userId &&
        (!info?.counterparty_id || info.counterparty_id === userId)));
  const inviteLink = useMemo(() => {
    if (!token) return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/join/${token}`;
  }, [locale, token]);
  const canManageShare = Boolean(isCreatorViewer && inviteStatus === "awaiting_acceptance" && inviteLink);
  const shareStatusLabel = inviteStatus === "accepted"
    ? t("invite.creatorShare.inviteAccepted")
    : inviteStatus === "expired"
    ? t("invite.creatorShare.inviteExpired")
    : null;

  async function copyInviteLink() {
    if (!canManageShare || !inviteLink) return;
    let didCopy = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
        didCopy = true;
      }
    } catch {
      didCopy = false;
    }
    setToastTone(didCopy ? "success" : "error");
    setToast(didCopy ? t("invite.creatorShare.copySuccess") : t("invite.creatorShare.copyFailed"));
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const hasCreatorCondition = Boolean(info?.condition_text?.trim());

  // CTA is blocked when user opened a text field but has fewer than 5 chars
  const conditionTextRequired =
    (conditionChoice === "edit" || conditionChoice === "add") &&
    conditionEditText.trim().length < 5;

  // Label switches to "Send proposal" as soon as add/edit radio is selected
  const willProposeCondition =
    canAccept && (conditionChoice === "edit" || conditionChoice === "add");

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
        <div className="flex items-center justify-end">
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
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">{t("invite.eyebrow")}</p>
              {isCreatorViewer && (
                <div className="flex flex-col items-end gap-1">
                  {canManageShare && (
                    <div className="flex items-center gap-2">
                      <Tooltip label={t("invite.creatorShare.copyInviteLink")} placement="top">
                        <button
                          type="button"
                          onClick={() => void copyInviteLink()}
                          aria-label={t("invite.creatorShare.copyInviteLink")}
                          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/5 text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                        >
                          <Copy className="h-4 w-4" aria-hidden />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                  {!canManageShare && shareStatusLabel && <p className="text-xs text-slate-300">{shareStatusLabel}</p>}
                </div>
              )}
            </div>
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
                <Tooltip label={t("invite.publicTooltip")} placement="top">
                  <span className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 font-semibold uppercase tracking-[0.08em] text-amber-100">
                    {t("invite.publicTag")}
                  </span>
                </Tooltip>
              )}
              {info.is_important && (
                <Tooltip label={t("invite.reputationStakeTooltip")} placement="top">
                  <span className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1.5 font-semibold uppercase tracking-[0.08em] text-slate-200">
                    {t("promises.important.label")}
                  </span>
                </Tooltip>
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

            {/* Counter-condition section — shown when invitee can respond */}
            {canAccept && (
              <section className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {t("invite.condition.sectionTitle")}
                </h3>

                {hasCreatorCondition ? (
                  <>
                    <p className="mt-1 text-xs text-slate-400">
                      {t("invite.condition.proposedByCreator")}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm leading-6 text-slate-100">
                      {info.condition_text}
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 has-[:checked]:border-emerald-400/40 has-[:checked]:bg-emerald-500/10 has-[:checked]:text-emerald-100">
                        <input
                          type="radio"
                          name="conditionChoice"
                          value="accept"
                          checked={conditionChoice === "accept"}
                          onChange={() => setConditionChoice("accept")}
                          className="cursor-pointer accent-emerald-400"
                        />
                        {t("invite.condition.acceptAsIs")}
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 has-[:checked]:border-white/20 has-[:checked]:bg-white/10 has-[:checked]:text-white">
                        <input
                          type="radio"
                          name="conditionChoice"
                          value="edit"
                          checked={conditionChoice === "edit"}
                          onChange={() => setConditionChoice("edit")}
                          className="cursor-pointer accent-white"
                        />
                        {t("invite.condition.suggestEdit")}
                      </label>
                    </div>
                    {conditionChoice === "edit" && (
                      <textarea
                        value={conditionEditText}
                        onChange={(e) => setConditionEditText(e.target.value.slice(0, 500))}
                        placeholder={t("invite.condition.editPlaceholder")}
                        rows={3}
                        className="mt-3 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 placeholder:text-white/30"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 has-[:checked]:border-emerald-400/40 has-[:checked]:bg-emerald-500/10 has-[:checked]:text-emerald-100">
                        <input
                          type="radio"
                          name="conditionChoice"
                          value="none"
                          checked={conditionChoice === null || conditionChoice === "accept"}
                          onChange={() => setConditionChoice("accept")}
                          className="cursor-pointer accent-emerald-400"
                        />
                        {t("invite.condition.acceptWithout")}
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 has-[:checked]:border-white/20 has-[:checked]:bg-white/10 has-[:checked]:text-white">
                        <input
                          type="radio"
                          name="conditionChoice"
                          value="add"
                          checked={conditionChoice === "add"}
                          onChange={() => setConditionChoice("add")}
                          className="cursor-pointer accent-white"
                        />
                        {t("invite.condition.addOwn")}
                      </label>
                    </div>
                    {conditionChoice === "add" && (
                      <textarea
                        value={conditionEditText}
                        onChange={(e) => setConditionEditText(e.target.value.slice(0, 500))}
                        placeholder={t("invite.condition.addPlaceholder")}
                        rows={3}
                        className="mt-3 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 placeholder:text-white/30"
                      />
                    )}
                  </>
                )}
              </section>
            )}

            {/* Awaiting confirmation state for invitee */}
            {isInviteeAwaitingConfirmation && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-300">
                {t("invite.condition.awaitingConfirmation")}
              </div>
            )}

            <div className="mt-6">
              {inviteAccepted ? (
                <div className="flex">
                  <div className="flex w-full items-center justify-between rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                    {t("invite.acceptedStateMessage")}
                    <Tooltip label={openDealLabel} placement="top-right">
                      <button
                        type="button"
                        aria-label={openDealLabel}
                        onClick={() => router.push(localizePath(`/promises/${info.id}`, locale))}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-white/5 text-emerald-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                      >
                        <ExternalLink className="h-5 w-5" aria-hidden />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ) : isAwaitingConfirmation && !isInviteeAwaitingConfirmation ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300">
                  {t("invite.awaitingCounterparty")}
                </div>
              ) : canAccept ? (
                <div className="flex flex-wrap justify-end gap-2">
                  {canAccept && (
                    <button
                      disabled={busy}
                      onClick={() => signedIn ? setShowDeclineModal(true) : void decline()}
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? t("invite.processing") : t("invite.decline")}
                    </button>
                  )}
                  <button
                    disabled={busy || conditionTextRequired}
                    onClick={() => {
                      if (info.visibility === "public") {
                        setShowAcceptModal(true);
                      } else {
                        void accept();
                      }
                    }}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
                  >
                    {busy
                      ? t("invite.processing")
                      : willProposeCondition
                      ? t("invite.proposeCondition")
                      : t("invite.acceptDeal")}
                  </button>
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

      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">
              {t("invite.declineModal.title")}
            </h2>
            <p className="mt-3 text-sm text-neutral-200">
              {t("invite.declineModal.body")}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                {t("invite.declineModal.cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeclineModal(false);
                  void decline();
                }}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                {t("invite.declineModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAcceptModal && info && !inviteAccepted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p4">
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
    </main>
  );
}

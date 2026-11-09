"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, Handshake, Hourglass, RotateCcw, Scale, Send, Share2, Swords, Trophy } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { LIMITS, type QuickView } from "@/lib/quickDisputes/state";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { VerdictCard } from "../VerdictCard";
import {
  Bubble,
  CopyField,
  PageShell,
  ShareButton,
  SkeletonRows,
  actionRowClass,
  StepsBar,
  TypingDots,
  decideFetch,
  primaryButtonClass,
  secondaryButtonClass,
  useErrorText,
  useLoginHref,
  useSignedIn,
  type StepIndex,
} from "../shared";

const POLL_MS = 5000;

const STEP: Record<QuickView["status"], StepIndex> = {
  awaiting_b: 1,
  awaiting_question: 1,
  rebuttals: 2,
  deciding: 2,
  decided: 3,
  expired: 1,
};

// The shared chat of a quick dispute: both positions, Dreddi's verdict right away, then one reply each
// and a single review of the verdict.
export default function QuickDisputePage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const signedIn = useSignedIn();
  const errorText = useErrorText();
  const loginHref = useLoginHref();
  const [view, setView] = useState<QuickView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rebuttal, setRebuttal] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [failed, setFailed] = useState<"decide" | "review" | null>(null);
  const autoRun = useRef({ decide: false, review: false });
  const [origin, setOrigin] = useState("");
  const [shared, setShared] = useState(false);
  const autoSaved = useRef(false);
  const rebuttalInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  const load = useCallback(async () => {
    const res = await decideFetch(`/api/decide/${id}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(errorText(body.error));
      return;
    }
    setView(body as QuickView);
  }, [id, errorText]);

  const act = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true);
      setPending(typeof payload.action === "string" ? payload.action : null);
      setError(null);
      try {
        const res = await decideFetch(`/api/decide/${id}`, { method: "POST", body: JSON.stringify(payload) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(errorText(body.error));
        if (body.cancelled) {
          router.push(localizePath("/", locale));
          return true;
        }
        setView(body as QuickView);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : t("decide.errors.generic"));
        void load();
        return false;
      } finally {
        setBusy(false);
        setPending(null);
      }
    },
    [id, errorText, load, t, router, locale]
  );

  // Coming back from sign-in with a save code, the claim loads the page itself: this browser may not
  // be a side yet (the sign-in link was opened elsewhere), so a plain load would be refused first.
  const saveParam = searchParams.get("save");
  const savingOnArrival = Boolean(signedIn && saveParam);

  useEffect(() => {
    if (signedIn === null || savingOnArrival) return;
    void load();
  }, [load, signedIn, savingOnArrival]);

  // Until the verdict and its review, the page keeps up with the other side.
  useEffect(() => {
    if (!view || view.status === "expired" || (view.status === "decided" && !view.replyOpen)) return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [view, load]);

  // Back from signing in to save the dispute: save it, by the one-time code when there is one.
  useEffect(() => {
    if (!signedIn || !saveParam || autoSaved.current) return;
    autoSaved.current = true;
    void act({ action: "claim", code: saveParam === "1" ? undefined : saveParam });
  }, [signedIn, saveParam, act]);

  // Not signed in: get a code that saves this side wherever the sign-in ends, then go to sign in.
  const goSave = async () => {
    setBusy(true);
    let code = "1";
    try {
      const res = await decideFetch(`/api/decide/${id}`, { method: "POST", body: JSON.stringify({ action: "claim_code" }) });
      const body = await res.json().catch(() => ({}));
      if (res.ok && typeof body.code === "string") code = body.code;
    } catch {
      // Without a code, saving still works when the sign-in ends in this browser.
    }
    const back = new URL(window.location.href);
    back.searchParams.set("save", code);
    const loginUrl = new URL(loginHref, window.location.origin);
    loginUrl.searchParams.set("next", `${back.pathname}${back.search}`);
    window.location.assign(loginUrl.toString());
  };

  // The first verdict as soon as both positions are in, and the review once the replies are: whichever
  // side has the page open asks for it (the server lets only one request do the work).
  useEffect(() => {
    if (!view || busy) return;
    const step = view.canDecideNow ? "decide" : view.canReviewNow ? "review" : null;
    if (!step || autoRun.current[step]) return;
    autoRun.current[step] = true;
    void act({ action: step }).then((ok) => setFailed(ok ? null : step));
  }, [view, busy, act]);

  useEffect(() => {
    if (!confirmCancel) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setConfirmCancel(false);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [confirmCancel]);

  if (!view) {
    return (
      <PageShell>
        {error ? (
          <div className="space-y-4">
            <p className="text-sm text-tone-300">{error}</p>
            <div className={actionRowClass}>
              <a href={localizePath("/decide/new", locale)} className={primaryButtonClass}>
                <Swords className="h-4 w-4" aria-hidden />
                {t("decide.join.startOwn")}
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-5" aria-busy="true">
            <SkeletonRows count={1} className="h-1.5" />
            <SkeletonRows count={1} className="h-9 w-2/3" />
            <SkeletonRows count={3} className="h-16" />
          </div>
        )}
      </PageShell>
    );
  }

  const me = view.parties.find((party) => party.isMe);
  const other = view.parties.find((party) => !party.isMe);
  const partyA = view.parties.find((party) => party.role === "A");
  const partyB = view.parties.find((party) => party.role === "B");
  const nicknames = { A: partyA?.nickname ?? "", B: partyB?.nickname ?? "" };
  const verdict = view.verdict;
  const winner = verdict ? verdict.winner : null;
  const inviteUrl = view.inviteToken && origin ? `${origin}${localizePath(`/decide/join/${view.inviteToken}`, locale)}` : null;
  const shareUrl = view.shareSlug && origin ? `${origin}${localizePath(`/d/${view.shareSlug}`, locale)}` : null;
  // Dreddi at work: on the first verdict, or on the review the last reply sets off.
  const deciding =
    (view.status === "rebuttals" && failed !== "decide") || (view.status === "deciding" && !view.reviewing) || pending === "decide";
  const reviewing =
    view.reviewing ||
    pending === "review" ||
    (busy && (pending === "rebuttal" || pending === "skip_rebuttal") && Boolean(other?.rebuttalDone));
  const dateTime = (iso: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-US" : "uk-UA", {
      timeZone: "Europe/Kyiv",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const sideOf = (role: "A" | "B") => (view.myRole === role ? "me" : "other") as "me" | "other";
  const labelOf = (party: NonNullable<typeof me>) => (
    <span className="inline-flex items-center gap-1">
      {winner === party.role && <Trophy className="h-3.5 w-3.5 text-amber-300" aria-hidden />}
      {party.isMe ? t("decide.youAs", { nickname: party.nickname }) : party.nickname}
    </span>
  );

  const inviteText = t("decide.shareText", { question: view.question });
  const messengers = inviteUrl
    ? [
        { name: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(inviteText)}` },
        { name: "Viber", href: `viber://forward?text=${encodeURIComponent(`${inviteText} ${inviteUrl}`)}` },
        { name: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${inviteText} ${inviteUrl}`)}` },
      ]
    : [];

  const shareVerdict = async () => {
    if (!shareUrl || !view.verdict) return;
    if (navigator.share) {
      await navigator.share({ title: view.question, text: view.verdict.share_text, url: shareUrl }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(`${view.verdict.share_text} ${shareUrl}`).catch(() => undefined);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <PageShell>
      <StepsBar current={STEP[view.status]} />
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent-200">
          <Scale className="h-3.5 w-3.5" aria-hidden />
          {t("decide.title")}
        </p>
        <h1 className="text-2xl font-semibold text-tone-white sm:text-3xl">{view.question}</h1>
        {view.stake && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 px-3 py-1 text-sm font-medium text-tone-200">
            <Handshake className="h-3.5 w-3.5 text-amber-400" aria-hidden />
            {t("decide.stake.inline", { stake: view.stake })}
          </p>
        )}
      </div>

      {inviteUrl && (
        <section className="decide-pop space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.07] p-4">
          <p className="text-base font-semibold text-tone-white">{t("decide.readyTitle")}</p>
          {/* On a phone the share sheet is the natural way to send; on a computer the link field below is. */}
          <div className="sm:hidden">
            <ShareButton
              url={inviteUrl}
              text={inviteText}
              title={view.question}
              label={t("decide.sendChallenge")}
              links={messengers}
            />
          </div>
          <CopyField text={inviteUrl} label={t("decide.copyLink")} copiedLabel={t("decide.linkCopied")} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs text-tone-400">
              <Hourglass className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("decide.waitingB")}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmCancel(true)}
              className="cursor-pointer text-xs font-medium text-danger-300 underline-offset-2 transition hover:text-danger-200 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("decide.cancel")}
            </button>
          </div>
        </section>
      )}

      {view.status === "expired" && <p className="text-sm text-tone-300">{t("decide.join.expired")}</p>}

      <div className="space-y-4 rounded-2xl border border-tone-white/10 bg-tone-black/20 p-3 sm:p-4">
        {partyA && (
          <Bubble side={sideOf("A")} name={partyA.nickname} label={labelOf(partyA)} highlight={winner === "A"}>
            <p className="whitespace-pre-wrap">{partyA.position}</p>
          </Bubble>
        )}
        {partyB ? (
          <Bubble side={sideOf("B")} name={partyB.nickname} label={labelOf(partyB)} highlight={winner === "B"} delayMs={80}>
            <p className="whitespace-pre-wrap">{partyB.position}</p>
          </Bubble>
        ) : (
          view.status === "awaiting_b" && (
            <Bubble side="other" name="?" label={t("decide.opponent")} ghost delayMs={80}>
              {t("decide.opponentEmpty")}
            </Bubble>
          )
        )}

        {deciding && (
          <div className="decide-pop flex items-center justify-center gap-2 py-2 text-sm font-medium text-accent-200">
            <Scale className="h-4 w-4" aria-hidden />
            {t("decide.chat.deciding")}
            <TypingDots />
          </div>
        )}
      </div>

      {view.status === "awaiting_question" &&
        (view.myRole === "A" ? (
          <div className="decide-pop space-y-3 rounded-2xl border border-accent-400/30 bg-accent-400/5 p-4">
            <p className="text-sm text-tone-300">{t("decide.chat.proposedWording", { nickname: other?.nickname ?? "" })}</p>
            <p className="text-lg font-semibold text-tone-white">{view.questionProposed}</p>
            <div className={actionRowClass}>
              <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void act({ action: "keep_question" })}>
                {t("decide.chat.keepMine")}
              </button>
              <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void act({ action: "accept_question" })}>
                {t("decide.chat.agree")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm text-tone-400">
              <Hourglass className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("decide.chat.waitingWording", { nickname: other?.nickname ?? "" })}
            </p>
            {view.wordingDeadline && (
              <p className="pl-5 text-xs text-tone-500">
                {t("decide.chat.wordingDeadline", { nickname: other?.nickname ?? "", date: dateTime(view.wordingDeadline) })}
              </p>
            )}
          </div>
        ))}

      {failed && !busy && (
        <div className="decide-pop flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warn-300/30 bg-warn-500/10 p-4">
          <p className="text-sm text-tone-200">{t("decide.chat.notDecided")}</p>
          <button type="button" className={primaryButtonClass} onClick={() => void act({ action: failed }).then((ok) => ok && setFailed(null))}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t("decide.chat.retry")}
          </button>
        </div>
      )}

      {verdict && (
        <div className="decide-pop space-y-4">
          {reviewing ? (
            <p className="flex items-center gap-2 text-sm font-medium text-accent-200">
              <Scale className="h-4 w-4" aria-hidden />
              {t("decide.reply.reviewing")}
              <TypingDots />
            </p>
          ) : view.reviewOutcome ? (
            <p className="flex items-center gap-2 text-sm font-medium text-tone-300">
              <RotateCcw className="h-4 w-4 text-accent-200" aria-hidden />
              {t(view.reviewOutcome === "changed" ? "decide.reply.changed" : "decide.reply.unchanged")}
            </p>
          ) : null}
          <div className={reviewing ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <VerdictCard verdict={verdict} nicknames={nicknames} t={t} />
          </div>

          {view.stakeOutcome && view.stake && (
            <div className="space-y-3 rounded-2xl border border-amber-300/40 bg-amber-300/[0.08] p-4">
              <p className="flex items-start gap-2 text-sm font-semibold text-tone-white">
                <Handshake className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                {view.stakeOutcome.state === "lost"
                  ? t("decide.stake.lost", { nickname: nicknames[view.stakeOutcome.loser], stake: view.stake })
                  : view.stakeOutcome.state === "void"
                    ? t("decide.stake.void")
                    : t("decide.stake.pending")}
              </p>
              {view.stakeOutcome.state === "lost" &&
                (view.stakePromiseId ? (
                  <div className={actionRowClass}>
                    <a
                      href={localizePath(
                        view.stakeInviteToken ? `/p/invite/${view.stakeInviteToken}` : `/promises/${view.stakePromiseId}`,
                        locale
                      )}
                      className={secondaryButtonClass}
                    >
                      <Check className="h-4 w-4 text-accent-200" aria-hidden />
                      {t("decide.stake.recorded")}
                    </a>
                  </div>
                ) : (
                  <div className={actionRowClass}>
                    {signedIn ? (
                      <a href={localizePath(`/promises/new?fromDispute=${view.id}`, locale)} className={primaryButtonClass}>
                        {t("decide.stake.record")}
                      </a>
                    ) : (
                      // A promise needs an account: sign in (which saves the dispute too), then record it.
                      <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void goSave()}>
                        {t("decide.stake.record")}
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}

          {view.parties.some((party) => party.rebuttal || (!party.isMe && party.rebuttalDone && view.replyOpen)) && (
            <div className="space-y-4 rounded-2xl border border-tone-white/10 bg-tone-black/20 p-3 sm:p-4">
              {view.parties.map((party) =>
                party.rebuttal ? (
                  <Bubble key={`r-${party.role}`} side={sideOf(party.role)} name={party.nickname} label={labelOf(party)}>
                    <p className="whitespace-pre-wrap">{party.rebuttal}</p>
                  </Bubble>
                ) : !party.isMe && party.rebuttalDone && me && !me.rebuttalDone && view.replyOpen ? (
                  <Bubble key={`r-${party.role}`} side="other" name={party.nickname} label={labelOf(party)} muted>
                    {t("decide.chat.rebuttalHidden", { nickname: party.nickname })}
                  </Bubble>
                ) : null
              )}
            </div>
          )}

          {view.replyOpen && me && !me.rebuttalDone && !reviewing && (
            <form
              className="space-y-3 rounded-2xl border-2 border-emerald-400/50 bg-emerald-400/[0.07] p-4 shadow-lg shadow-accent-500/10"
              onSubmit={(e) => {
                e.preventDefault();
                // An empty reply sends nothing: it points to the field instead.
                if (!rebuttal.trim()) {
                  rebuttalInputRef.current?.focus();
                  return;
                }
                void act({ action: "rebuttal", text: rebuttal }).then((ok) => ok && setRebuttal(""));
              }}
            >
              <div className="space-y-1">
                <p className="text-base font-semibold text-tone-white">{t("decide.reply.title")}</p>
                <p className="text-sm text-tone-300">{t("decide.reply.hint")}</p>
              </div>
              <textarea
                ref={rebuttalInputRef}
                className="min-h-[96px] w-full rounded-xl border border-emerald-400/30 bg-tone-950/60 px-3 py-2 text-sm text-tone-white outline-none placeholder:text-tone-500 focus:border-emerald-400/70"
                value={rebuttal}
                maxLength={LIMITS.rebuttal}
                placeholder={t("decide.reply.placeholder")}
                onChange={(e) => setRebuttal(e.target.value)}
              />
              <div className={actionRowClass}>
                <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void act({ action: "skip_rebuttal" })}>
                  {t("decide.chat.noReply")}
                </button>
                <button type="submit" className={`${primaryButtonClass} py-3 text-base`} disabled={busy}>
                  <Send className="h-4 w-4" aria-hidden />
                  {t("decide.reply.send")}
                </button>
              </div>
            </form>
          )}

          {view.replyOpen && me?.rebuttalDone && other && !other.rebuttalDone && !reviewing && (
            <p className="flex items-start gap-2 text-sm text-tone-400">
              <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {me.rebuttal && view.replyDeadline
                ? t("decide.reply.waiting", { nickname: other.nickname, date: dateTime(view.replyDeadline) })
                : t("decide.chat.waitingRebuttal", { nickname: other.nickname })}
            </p>
          )}

          {/* Secondary actions in one row on every screen; sharing is an icon, the stake keeps the only green. */}
          <div className="flex items-center gap-2 sm:justify-end">
            {view.saved ? (
              <span className="inline-flex flex-1 items-center gap-1.5 py-2 text-sm text-tone-400 sm:mr-auto sm:flex-none">
                <Check className="h-4 w-4 text-accent-200" aria-hidden />
                {t("decide.verdict.saved")}
              </span>
            ) : (
              <button
                type="button"
                className={`${secondaryButtonClass} flex-1 whitespace-nowrap px-3 sm:flex-none sm:px-4`}
                disabled={busy}
                onClick={() => void (signedIn ? act({ action: "claim" }) : goSave())}
              >
                {t("decide.verdict.save")}
              </button>
            )}
            <a href={localizePath("/decide/new", locale)} className={`${secondaryButtonClass} flex-1 whitespace-nowrap px-3 sm:flex-none sm:px-4`}>
              <Swords className="h-4 w-4" aria-hidden />
              {t("decide.verdict.rematch")}
            </a>
            {shareUrl && (
              <Tooltip label={shared ? t("decide.linkCopied") : t("decide.verdict.share")} placement="top">
                <button
                  type="button"
                  onClick={() => void shareVerdict()}
                  aria-label={shared ? t("decide.linkCopied") : t("decide.verdict.share")}
                  className="inline-flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-tone-white/15 text-tone-200 transition hover:border-accent-300/50 hover:text-accent-200"
                >
                  {shared ? <Check className="h-4 w-4 text-accent-200" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
                </button>
              </Tooltip>
            )}
          </div>
          {!view.saved && !signedIn && <p className="text-xs text-tone-400 sm:text-right">{t("decide.verdict.saveHint")}</p>}
          {verdict.suggest_mediation && (
            <div className="space-y-2 rounded-2xl border border-tone-white/10 bg-tone-white/[0.03] p-4">
              <p className="text-sm text-tone-200">{t("decide.verdict.mediation")}</p>
              <div className={actionRowClass}>
                <a href={localizePath("/promises/new", locale)} className={secondaryButtonClass}>
                  {t("decide.verdict.mediationButton")}
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger-300">{error}</p>}

      {/* Same confirmation as declining an agreement invite: the dispute and its link are gone for good. */}
      {confirmCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-tone-black/70 p-4"
          onMouseDown={(event) => event.target === event.currentTarget && setConfirmCancel(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-dispute-title"
            className="w-full max-w-md rounded-2xl border border-tone-white/10 bg-ntone-900 p-6 shadow-2xl"
          >
            <h2 id="cancel-dispute-title" className="text-xl font-semibold text-tone-white">
              {t("decide.cancelConfirm.title")}
            </h2>
            <p className="mt-3 text-sm text-ntone-200">{t("decide.cancelConfirm.body")}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmCancel(false)}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-tone-white/20 bg-tone-white/5 px-4 py-2 text-sm font-semibold text-tone-white transition hover:bg-tone-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tone-white/15 focus-visible:ring-offset-2 focus-visible:ring-offset-ntone-950"
              >
                {t("decide.cancelConfirm.back")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirmCancel(false);
                  void act({ action: "cancel" });
                }}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-tone-white shadow-lg shadow-danger-500/25 transition hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ntone-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("decide.cancelConfirm.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

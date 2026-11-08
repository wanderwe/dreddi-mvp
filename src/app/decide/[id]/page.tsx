"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Hourglass, RotateCcw, Scale, Send, Share2, Swords, Trophy } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { formatKyivDate } from "@/lib/ai/kyivDate";
import { LIMITS, type QuickView } from "@/lib/quickDisputes/state";
import { VerdictCard } from "../VerdictCard";
import {
  Bubble,
  CopyField,
  PageShell,
  StepsBar,
  TypingDots,
  decideFetch,
  inputClass,
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
  deciding: 3,
  decided: 4,
  expired: 1,
};

// The shared chat of a quick dispute: both positions, one rebuttal each, then Dreddi's verdict.
export default function QuickDisputePage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const signedIn = useSignedIn();
  const errorText = useErrorText();
  const loginToSave = useLoginHref("?save=1");
  const [view, setView] = useState<QuickView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rebuttal, setRebuttal] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [shared, setShared] = useState(false);
  const autoSaved = useRef(false);

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

  useEffect(() => {
    if (signedIn === null) return;
    void load();
  }, [load, signedIn]);

  // Until the verdict, the page keeps up with the other side.
  useEffect(() => {
    if (!view || view.status === "decided" || view.status === "expired") return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [view, load]);

  // Back from signing in to save the dispute: save it.
  useEffect(() => {
    if (!view || !signedIn || view.saved || autoSaved.current || searchParams.get("save") !== "1") return;
    autoSaved.current = true;
    void act({ action: "claim" });
  }, [view, signedIn, searchParams, act]);

  if (!view) {
    return (
      <PageShell>
        {error ? (
          <div className="space-y-4">
            <p className="text-sm text-tone-300">{error}</p>
            <a href={localizePath("/decide/new", locale)} className={primaryButtonClass}>
              <Swords className="h-4 w-4" aria-hidden />
              {t("decide.join.startOwn")}
            </a>
          </div>
        ) : (
          <div className="flex justify-center py-10 text-tone-400">
            <TypingDots />
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
  const winner = view.status === "decided" && view.verdict ? view.verdict.winner : null;
  const inviteUrl = view.inviteToken && origin ? `${origin}${localizePath(`/decide/join/${view.inviteToken}`, locale)}` : null;
  const shareUrl = view.shareSlug && origin ? `${origin}${localizePath(`/d/${view.shareSlug}`, locale)}` : null;
  const bothDone = view.parties.length === 2 && view.parties.every((party) => party.rebuttalDone);
  const stuck = view.status === "rebuttals" && bothDone && !busy;
  // The request that completes the replies also waits for the verdict, so show Dreddi at work right away.
  const finishing =
    pending === "decide" ||
    ((pending === "rebuttal" || pending === "skip_rebuttal") && Boolean(other?.rebuttalDone));
  const deciding = view.status === "deciding" || (busy && view.status === "rebuttals" && finishing);

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
      </div>

      {inviteUrl && (
        <section className="decide-pop space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.07] p-4">
          <p className="text-base font-semibold text-tone-white">{t("decide.readyTitle")}</p>
          <div className="grid grid-cols-3 gap-2">
            {messengers.map((messenger) => (
              <a
                key={messenger.name}
                href={messenger.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${secondaryButtonClass} px-2`}
              >
                {messenger.name}
              </a>
            ))}
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
              onClick={() => void act({ action: "cancel" })}
              className="cursor-pointer text-xs font-medium text-tone-400 underline-offset-2 hover:text-danger-300 hover:underline"
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

        {view.parties.map((party) =>
          party.rebuttal ? (
            <Bubble key={`r-${party.role}`} side={sideOf(party.role)} name={party.nickname} label={labelOf(party)}>
              <p className="whitespace-pre-wrap">{party.rebuttal}</p>
            </Bubble>
          ) : !party.isMe && party.rebuttalDone && me && !me.rebuttalDone && view.status === "rebuttals" ? (
            <Bubble key={`r-${party.role}`} side="other" name={party.nickname} label={labelOf(party)} muted>
              {t("decide.chat.rebuttalHidden", { nickname: party.nickname })}
            </Bubble>
          ) : null
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
            <div className="flex flex-wrap gap-2">
              <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void act({ action: "accept_question" })}>
                {t("decide.chat.agree")}
              </button>
              <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void act({ action: "keep_question" })}>
                {t("decide.chat.keepMine")}
              </button>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-tone-400">
            <Hourglass className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("decide.chat.waitingWording", { nickname: other?.nickname ?? "" })}
          </p>
        ))}

      {view.status === "rebuttals" && me && !me.rebuttalDone && !deciding && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void act({ action: "rebuttal", text: rebuttal }).then((ok) => ok && setRebuttal(""));
          }}
        >
          <textarea
            className={`${inputClass} min-h-[90px]`}
            value={rebuttal}
            maxLength={LIMITS.rebuttal}
            placeholder={t("decide.chat.rebuttalPlaceholder")}
            onChange={(e) => setRebuttal(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={primaryButtonClass} disabled={busy || !rebuttal.trim()}>
              <Send className="h-4 w-4" aria-hidden />
              {t("decide.chat.reply")}
            </button>
            <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void act({ action: "skip_rebuttal" })}>
              {t("decide.chat.noReply")}
            </button>
          </div>
        </form>
      )}

      {view.status === "rebuttals" && me?.rebuttalDone && other && !other.rebuttalDone && !deciding && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm text-tone-400">
            <Hourglass className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("decide.chat.waitingRebuttal", { nickname: other.nickname })}
          </p>
          {view.canDecideNow ? (
            <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void act({ action: "decide" })}>
              {t("decide.chat.decideNow")}
            </button>
          ) : view.decideNowAt ? (
            <p className="text-xs text-tone-500">
              {t("decide.chat.decideNow")}: {t("decide.chat.availableAt", {
                date: formatKyivDate(new Date(view.decideNowAt), locale === "en" ? "en-US" : "uk-UA"),
              })}
            </p>
          ) : null}
        </div>
      )}

      {stuck && (
        <div className="decide-pop flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warn-300/30 bg-warn-500/10 p-4">
          <p className="text-sm text-tone-200">{t("decide.chat.notDecided")}</p>
          <button type="button" className={primaryButtonClass} onClick={() => void act({ action: "decide" })}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t("decide.chat.retry")}
          </button>
        </div>
      )}

      {view.status === "decided" && view.verdict && (
        <div className="decide-pop space-y-4">
          <VerdictCard verdict={view.verdict} nicknames={nicknames} t={t} />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {shareUrl && (
              <button type="button" className={primaryButtonClass} onClick={() => void shareVerdict()}>
                <Share2 className="h-4 w-4" aria-hidden />
                {shared ? t("decide.linkCopied") : t("decide.verdict.share")}
              </button>
            )}
            {view.saved ? (
              <span className="self-center text-sm text-tone-400">{t("decide.verdict.saved")}</span>
            ) : signedIn ? (
              <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void act({ action: "claim" })}>
                {t("decide.verdict.save")}
              </button>
            ) : (
              <a href={loginToSave} className={secondaryButtonClass}>
                {t("decide.verdict.save")}
              </a>
            )}
            <a href={localizePath(`/decide/new?q=${encodeURIComponent(view.question)}`, locale)} className={secondaryButtonClass}>
              <Swords className="h-4 w-4" aria-hidden />
              {t("decide.verdict.rematch")}
            </a>
          </div>
          {!view.saved && !signedIn && <p className="text-xs text-tone-400">{t("decide.verdict.saveHint")}</p>}
          {view.verdict.suggest_mediation && (
            <div className="space-y-2 rounded-2xl border border-tone-white/10 bg-tone-white/[0.03] p-4">
              <p className="text-sm text-tone-200">{t("decide.verdict.mediation")}</p>
              <a href={localizePath("/promises/new", locale)} className={secondaryButtonClass}>
                {t("decide.verdict.mediationButton")}
              </a>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger-300">{error}</p>}
    </PageShell>
  );
}

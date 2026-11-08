"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { formatKyivDate } from "@/lib/ai/kyivDate";
import { LIMITS, type QuickView } from "@/lib/quickDisputes/state";
import { VerdictCard } from "../VerdictCard";
import {
  PageShell,
  decideFetch,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  useErrorText,
  useLoginHref,
  useSignedIn,
} from "../shared";

const POLL_MS = 5000;

// The shared chat of a quick dispute: both positions, one rebuttal each, then Dreddi's verdict.
export default function QuickDisputePage() {
  const t = useT();
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const signedIn = useSignedIn();
  const errorText = useErrorText();
  const loginToSave = useLoginHref("?save=1");
  const [view, setView] = useState<QuickView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rebuttal, setRebuttal] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoSaved = useRef(false);

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
      setError(null);
      try {
        const res = await decideFetch(`/api/decide/${id}`, { method: "POST", body: JSON.stringify(payload) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(errorText(body.error));
        setView(body as QuickView);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : t("decide.errors.generic"));
        void load();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [id, errorText, load, t]
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
    return <PageShell>{error && <p className="text-sm text-tone-300">{error}</p>}</PageShell>;
  }

  const me = view.parties.find((party) => party.isMe);
  const other = view.parties.find((party) => !party.isMe);
  const nicknames = {
    A: view.parties.find((party) => party.role === "A")?.nickname ?? "",
    B: view.parties.find((party) => party.role === "B")?.nickname ?? "",
  };
  const inviteUrl =
    view.inviteToken && typeof window !== "undefined"
      ? `${window.location.origin}${localizePath(`/decide/join/${view.inviteToken}`, locale)}`
      : null;
  const shareUrl =
    view.shareSlug && typeof window !== "undefined"
      ? `${window.location.origin}${localizePath(`/d/${view.shareSlug}`, locale)}`
      : null;

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (!shareUrl || !view.verdict) return;
    if (navigator.share) {
      await navigator.share({ title: view.question, text: view.verdict.share_text, url: shareUrl }).catch(() => undefined);
    } else {
      await copy(`${view.verdict.share_text} ${shareUrl}`);
    }
  };

  return (
    <PageShell>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-accent-200">{t("decide.title")}</p>
        <h1 className="text-2xl font-semibold text-tone-white sm:text-3xl">{view.question}</h1>
      </div>

      {inviteUrl && (
        <div className="space-y-2 rounded-2xl border border-tone-white/10 bg-tone-white/[0.03] p-4">
          <p className="text-sm font-semibold text-tone-200">{t("decide.sendLink")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${inputClass} flex-1`} value={inviteUrl} readOnly onFocus={(e) => e.target.select()} />
            <button type="button" className={secondaryButtonClass} onClick={() => void copy(inviteUrl)}>
              {copied ? t("decide.linkCopied") : t("decide.copyLink")}
            </button>
          </div>
          <p className="text-xs text-tone-400">{t("decide.waitingB")}</p>
        </div>
      )}

      {view.status === "expired" && <p className="text-sm text-tone-300">{t("decide.join.expired")}</p>}

      <div className="space-y-3">
        {view.parties.map((party) => (
          <div key={party.role} className="rounded-2xl border border-tone-white/10 bg-tone-white/[0.03] p-4">
            <p className="text-xs font-semibold text-tone-400">
              {party.nickname}
              {party.isMe ? ` · ${t("decide.chat.you")}` : ""}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-tone-100">{party.position}</p>
            {party.rebuttal && (
              <p className="mt-3 whitespace-pre-wrap border-l-2 border-accent-400/40 pl-3 text-sm text-tone-200">
                {party.rebuttal}
              </p>
            )}
            {!party.isMe && party.rebuttalDone && !party.rebuttal && me && !me.rebuttalDone && view.status === "rebuttals" && (
              <p className="mt-2 text-xs text-tone-400">{t("decide.chat.rebuttalHidden", { nickname: party.nickname })}</p>
            )}
          </div>
        ))}
      </div>

      {view.status === "awaiting_question" &&
        (view.myRole === "A" ? (
          <div className="space-y-3 rounded-2xl border border-accent-400/30 bg-accent-400/5 p-4">
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
          <p className="text-sm text-tone-400">{t("decide.chat.waitingWording", { nickname: other?.nickname ?? "" })}</p>
        ))}

      {view.status === "rebuttals" && me && !me.rebuttalDone && (
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
              {t("decide.chat.reply")}
            </button>
            <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void act({ action: "skip_rebuttal" })}>
              {t("decide.chat.noReply")}
            </button>
          </div>
        </form>
      )}

      {view.status === "rebuttals" && me?.rebuttalDone && other && !other.rebuttalDone && (
        <div className="space-y-2">
          <p className="text-sm text-tone-400">{t("decide.chat.waitingRebuttal", { nickname: other.nickname })}</p>
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

      {(view.status === "deciding" || (busy && view.status === "rebuttals")) && (
        <p className="animate-pulse text-sm text-accent-200">{t("decide.chat.deciding")}</p>
      )}

      {view.status === "decided" && view.verdict && (
        <>
          <VerdictCard verdict={view.verdict} nicknames={nicknames} t={t} />
          <div className="flex flex-wrap gap-2">
            {shareUrl && (
              <button type="button" className={primaryButtonClass} onClick={() => void share()}>
                {copied ? t("decide.linkCopied") : t("decide.verdict.share")}
              </button>
            )}
            {view.saved ? (
              <span className="self-center text-sm text-tone-400">{t("decide.verdict.saved")}</span>
            ) : signedIn ? (
              <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void act({ action: "claim" })}>
                {t("decide.verdict.save")}
              </button>
            ) : (
              <a href={loginToSave} className={secondaryButtonClass} title={t("decide.verdict.saveHint")}>
                {t("decide.verdict.save")}
              </a>
            )}
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
        </>
      )}

      {error && <p className="text-sm text-danger-300">{error}</p>}
    </PageShell>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { JudgeImage, JudgePhase, Speaker } from "@/lib/ai/judge";
import { caseNumber } from "@/lib/ai/caseNumber";
import { formatKyivDate } from "@/lib/ai/kyivDate";
import { toJudgeImage } from "@/lib/ai/judgeImage";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { Share2, Sparkles } from "lucide-react";
import { Tooltip } from "@/app/components/ui/Tooltip";

// Dreddi, the AI judge, on a real promise. Renders nothing for someone who is not a side of it.

type CaseMessage = {
  id: string;
  author_role: Speaker | "judge";
  author_name: string | null;
  phase: JudgePhase;
  content: string;
  evidence_notes: string[];
  verdict: "kept" | "not_kept" | "undecided" | null;
  confidence: number | null;
  reasons: string[] | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  in_absentia: boolean;
  approves_message_id: string | null;
  created_at: string;
};

type CaseView = {
  role: Speaker;
  agreedCriteria: string[];
  criteria: string[];
  criteriaStatus: "none" | "draft" | "proposed" | "agreed";
  criteriaAgreed: boolean;
  approvedEarlierVersion: boolean;
  proposalId: string | null;
  // The sides that must approve, and whether each one has.
  approvals: Partial<Record<Speaker, boolean>>;
  // Sides that were called and have not answered yet; overdue: Dreddi may rule without them.
  awaiting: { role: Speaker; since: string; until: string; overdue: boolean }[];
  promiseTitle: string;
  messageLimit: number;
  messagesLeft: number;
  // The latest kept / not kept ruling: pending until accepted, appealed or 3 days pass.
  ruling: {
    rulingId: string;
    verdict: "kept" | "not_kept";
    acceptedBy: Speaker[];
    bindsAt: string;
    appealed: boolean;
    binding: null | "self" | "accepted" | "silence";
  } | null;
  // The promise is confirmed or disputed: nothing is left to decide here.
  closed: boolean;
  messages: CaseMessage[];
};

// The server stores this marker, not a sentence, so each side reads it in their own language.
const BINDING_PREFIX = "ruling-binding:";
const VERDICT_CLASSES = {
  kept: "bg-emerald-300/10 text-accent-100",
  not_kept: "bg-rose-300/10 text-alert-100",
  undecided: "bg-tone-200/10 text-tone-200",
} as const;

const VISIBLE_MESSAGES = 4;
// The composer shows the beta message count only once it gets close to the limit.
const FEW_MESSAGES_LEFT = 5;

const inputClass =
  "w-full rounded-xl border border-tone-white/10 bg-tone-white/5 px-3 py-2 text-sm text-tone-white outline-none focus:border-accent-300/60";

// promiseStatus: when the promise is marked done, confirmed or disputed on the same page, the case is
// read again, so a closed case shows as closed instead of offering a message the server will refuse.
export function JudgePanel({ promiseId, promiseStatus }: { promiseId: string; promiseStatus?: string }) {
  const t = useT();
  const locale = useLocale();
  const formatDate = (value: string) => formatKyivDate(new Date(value), locale === "en" ? "en-GB" : "uk-UA");
  const roleLabel = (role: CaseMessage["author_role"]) => t(`arbitration.roles.${role}`);
  const verdictLabel = (verdict: CaseMessage["verdict"] & string) => t(`arbitration.verdict.${verdict}`);
  // Approvals and "the ruling took effect" are stored as markers; show them in the reader's language.
  const messageText = (message: CaseMessage) => {
    if (message.content.startsWith(BINDING_PREFIX)) {
      const [how, verdict] = message.content.slice(BINDING_PREFIX.length).split(":");
      const howText = how === "accepted" ? t("arbitration.ruling.bindingAccepted") : how === "silence" ? t("arbitration.ruling.bindingSilence") : "";
      const status = verdict === "kept" ? t("promises.status.confirmed") : t("promises.status.disputed");
      return t("arbitration.ruling.binding", { how: howText, status });
    }
    if (message.approves_message_id) {
      return message.phase === "verdict" ? t("arbitration.acceptedRuling") : t("arbitration.approvedCriteria");
    }
    if (message.content === "(evidence only)") return t("arbitration.evidenceOnly");
    return message.content;
  };
  const errorText = useCallback(
    (status: number, fallback?: string) =>
      status === 409
        ? t("arbitration.errors.stale")
        : status === 429 && fallback === "case_limit"
          ? t("arbitration.errors.caseLimit")
          : status === 429 && fallback === "daily_limit"
            ? t("arbitration.errors.dailyLimit")
            : fallback ?? `HTTP ${status}`,
    [t]
  );
  const [view, setView] = useState<CaseView | null>(null);
  const [text, setText] = useState("");

  const [showAll, setShowAll] = useState(false);
  const [images, setImages] = useState<JudgeImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summonCopied, setSummonCopied] = useState(false);
  // The message being sent: shown in the case at once, with Dreddi thinking under it, until the answer comes.
  const [pending, setPending] = useState<{ text: string; images: number } | null>(null);
  const number = caseNumber(promiseId);

  const call = useCallback(
    async (init?: RequestInit) => {
      const { data } = await requireSupabase().auth.getSession();
      if (!data.session) return null;
      return fetch(`/api/promises/${promiseId}/judge`, {
        ...init,
        headers: { ...init?.headers, Authorization: `Bearer ${data.session.access_token}` },
      });
    },
    [promiseId]
  );

  const applyView = (next: CaseView) => {
    setView(next);
  };

  const loadView = useCallback(async () => {
    const res = await call().catch(() => null);
    if (!res || !res.ok) return null;
    return (await res.json()) as CaseView;
  }, [call]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const res = await call().catch(() => null);
      // 404: no such promise. 403: not a side of this promise. Either way, no panel.
      if (!active || !res || res.status === 404 || res.status === 403) return;
      const body = await res.json();
      if (!active) return;
      if (res.ok) applyView(body as CaseView);
      else setError(errorText(res.status, body.error));
    })();
    return () => {
      active = false;
    };
  }, [call, errorText, promiseStatus]);

  // The case was closed while this page was open (by the other side, or in another tab): show it closed.
  const isCaseClosedError = (status: number, body: { error?: string }) => status === 409 && body.error === "case_closed";
  const showClosed = async () => {
    const next = await loadView();
    if (next) applyView(next);
  };

  // Ready-to-send text for a messenger, with a link straight to this arbitration block.
  // It says what the other side is needed for now: answering a request to decide, approving criteria, or just the case.
  const copySummons = async () => {
    if (!view) return;
    const link = `${window.location.origin}${window.location.pathname}#arbitration`;
    const waiting = view.awaiting.find((item) => item.role !== view.role);
    const otherApproved = Object.entries(view.approvals).some(([side, approved]) => side !== view.role && approved);
    const message = waiting
      ? t("arbitration.summon", { title: view.promiseTitle, number, link })
      : view.criteriaStatus === "proposed" && !otherApproved
        ? t("arbitration.summonCriteria", { title: view.promiseTitle, number, link })
        : t("arbitration.summonCase", { title: view.promiseTitle, number, link });
    try {
      await navigator.clipboard.writeText(message);
      setSummonCopied(true);
      window.setTimeout(() => setSummonCopied(false), 2500);
    } catch {
      setError(t("arbitration.summonFailed"));
    }
  };

  const approve = async (targetId: string | null | undefined) => {
    if (!targetId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await call({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", proposalId: targetId }),
      });
      if (!res) throw new Error(t("arbitration.errors.signIn"));
      const body = await res.json();
      if (!res.ok) throw new Error(errorText(res.status, body.error));
      applyView(body as CaseView);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!text.trim() && images.length === 0) return;
    const sentText = text;
    const sentImages = images;
    setBusy(true);
    setError(null);
    setPending({ text: sentText, images: sentImages.length });
    setText("");
    setImages([]);
    try {
      const res = await call({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentText, images: sentImages }),
      });
      if (!res) throw new Error(t("arbitration.errors.signIn"));
      const body = await res.json();
      if (isCaseClosedError(res.status, body)) {
        await showClosed();
        return;
      }
      if (!res.ok) throw new Error(errorText(res.status, body.error));
      applyView(body as CaseView);
    } catch (err) {
      // Nothing was saved: give the text back so it is not lost.
      setText(sentText);
      setImages(sentImages);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(null);
      setBusy(false);
    }
  };

  if (!view && !error) return null;

  // Only the latest messages show by default; Dreddi still gets the whole case from the server.
  const messages = view?.messages ?? [];
  const visibleMessages = showAll ? messages : messages.slice(-VISIBLE_MESSAGES);
  const hiddenCount = messages.length - visibleMessages.length;
  const revising = Boolean(view?.criteriaAgreed && view.criteriaStatus !== "agreed");
  const pendingRuling = Boolean(view?.ruling && !view.ruling.binding && !view.ruling.appealed && !view.closed);

  return (
    <section
      id="arbitration"
      className="scroll-mt-24 space-y-4 rounded-2xl border border-accent-300/20 bg-tone-white/[0.03] p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-tone-white">
          {t("arbitration.title")}
          {/* Violet, not the green of primary actions: the usual mark of an AI feature. */}
          {/* The beta limit lives in the badge's tooltip, so the composer is not cluttered while it is far off. */}
          <Tooltip
            label={
              view
                ? t("arbitration.betaLimit", { limit: view.messageLimit, count: view.messagesLeft })
                : t("arbitration.beta")
            }
          >
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-500">
              <Sparkles className="h-3 w-3" aria-hidden />
              {t("arbitration.beta")}
            </span>
          </Tooltip>
          <span className="text-xs font-normal text-tone-400">{t("arbitration.caseNumber", { number })}</span>
        </h2>
        {/* Any stage may need the other side: approving criteria or answering a request to decide. */}
        {view && "counterparty" in view.approvals && !view.closed && view.messages.length > 0 && (
          <span className="flex items-center gap-2 text-xs">
            {summonCopied && <span className="text-accent-200">{t("arbitration.summonCopied")}</span>}
            <Tooltip label={t("arbitration.copySummons")}>
              <button
                type="button"
                onClick={() => void copySummons()}
                aria-label={t("arbitration.copySummons")}
                className="cursor-pointer rounded-xl border border-tone-white/15 p-2 text-tone-200 transition hover:border-accent-300/40 hover:text-accent-100"
              >
                <Share2 className="h-4 w-4" aria-hidden />
              </button>
            </Tooltip>
          </span>
        )}
      </header>

      {view && view.awaiting.some((item) => item.role !== view.role) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-tone-300">
          {view.awaiting
            .filter((item) => item.role !== view.role)
            .map((item) => (
              <span key={item.role}>
                {item.overdue
                  ? t("arbitration.awaitingOverdue", { role: roleLabel(item.role) })
                  : t("arbitration.awaiting", { role: roleLabel(item.role) })}
              </span>
            ))}
        </div>
      )}

      {/* Agreed criteria are a reference, not an action: on top and folded, so the latest messages stay in view. */}
      {view && view.criteriaAgreed && (
        <details className="group rounded-xl border border-accent-300/20 bg-emerald-400/5 p-3">
          <summary className="cursor-pointer list-none text-xs uppercase tracking-[0.2em] text-accent-200">
            {t("arbitration.criteria.title")} · {t("arbitration.criteria.agreed")} ({view.agreedCriteria.length})
            <span className="ml-1 inline-block transition group-open:rotate-180" aria-hidden>
              ▾
            </span>
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-tone-100">
            {view.agreedCriteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {!revising && !view.ruling && !view.closed && (
            <p className="mt-2 text-[11px] text-tone-500">{t("arbitration.criteria.changeHint")}</p>
          )}
        </details>
      )}

      {view && view.messages.length === 0 && !pending && (
        <p className="text-sm text-tone-300">{t("arbitration.empty")}</p>
      )}

      <div className="space-y-3">
        {(hiddenCount > 0 || (showAll && messages.length > VISIBLE_MESSAGES)) && (
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="w-full cursor-pointer rounded-xl border border-dashed border-tone-white/15 py-2 text-xs text-tone-400 transition hover:text-accent-100"
          >
            {showAll ? t("arbitration.hideEarlier") : t("arbitration.showEarlier", { count: hiddenCount })}
          </button>
        )}
        {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={`rounded-xl border p-3 text-sm ${
              message.author_role === "judge"
                ? "border-accent-300/20 bg-tone-white/5 text-tone-100"
                : "ml-6 border-tone-white/10 text-tone-200"
            }`}
          >
            <p className="mb-1 text-xs text-tone-400">
              {roleLabel(message.author_role)}
              {message.author_name ? ` · ${message.author_name}` : ""} · {formatDate(message.created_at)}
            </p>
            <p className="whitespace-pre-wrap">{messageText(message)}</p>
            {message.evidence_notes.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-tone-400">
                {message.evidence_notes.map((note) => (
                  <li key={note}>{t("arbitration.evidence", { note })}</li>
                ))}
              </ul>
            )}
            {message.verdict && (
              <div className="mt-2 space-y-1">
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${VERDICT_CLASSES[message.verdict]}`}>
                  {verdictLabel(message.verdict)}
                  {message.in_absentia ? ` · ${t("arbitration.inAbsentia")}` : ""}
                  {message.confidence !== null
                    ? ` · ${t("arbitration.confidence", { value: Math.round(message.confidence * 100) })}`
                    : ""}
                </span>
                {message.reasons && message.reasons.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-tone-300">
                    {message.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {message.model && (
              <p className="mt-2 text-[11px] text-tone-500">
                {message.model} ·{" "}
                {t("arbitration.tokens", { input: message.input_tokens ?? 0, output: message.output_tokens ?? 0 })}
              </p>
            )}
          </div>
        ))}
        {pending && view && (
          <>
            <div className="ml-6 rounded-xl border border-tone-white/10 p-3 text-sm text-tone-200 opacity-80">
              <p className="mb-1 text-xs text-tone-400">{roleLabel(view.role)}</p>
              <p className="whitespace-pre-wrap">{pending.text || t("arbitration.evidenceOnly")}</p>
              {pending.images > 0 && (
                <p className="mt-1 text-xs text-tone-400">{t("arbitration.attached", { count: pending.images })}</p>
              )}
            </div>
            <p className="flex items-center gap-2 text-xs text-tone-300" role="status">
              <span className="inline-flex gap-1" aria-hidden>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-300 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-300 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-300" />
              </span>
              {t("arbitration.thinking")}
            </p>
          </>
        )}
        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-danger-200">{error}</p>}
      </div>

      {/* Near the input: only criteria that still wait for the sides. */}
      {view && view.criteria.length > 0 && view.criteriaStatus !== "agreed" && (
        <div
          className={`rounded-xl border p-3 ${
            revising ? "border-dashed border-accent-300/30" : "border-accent-300/20 bg-emerald-400/5"
          }`}
        >
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-accent-200">
            {revising ? t("arbitration.criteria.revisionTitle") : t("arbitration.criteria.title")}
            {view.criteriaStatus !== "none" ? ` · ${t(`arbitration.criteria.${view.criteriaStatus}`)}` : ""}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-tone-100">
            {view.criteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {view.criteriaStatus === "proposed" && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-tone-300">
              {(Object.entries(view.approvals) as [Speaker, boolean][]).map(([side, approved]) => (
                <span key={side}>
                  {roleLabel(side)}: {approved ? t("arbitration.criteria.approved") : t("arbitration.criteria.waiting")}
                </span>
              ))}
              {!view.approvals[view.role] && (
                <button
                  type="button"
                  onClick={() => void approve(view.proposalId)}
                  disabled={busy}
                  className="w-full cursor-pointer rounded-xl border border-accent-300/40 px-3 py-2 sm:ml-auto sm:w-auto sm:py-1.5 text-sm font-semibold text-accent-100 transition hover:bg-emerald-400/10 disabled:opacity-50"
                >
                  {t("arbitration.criteria.approve")}
                </button>
              )}
            </div>
          )}
          {view.criteriaStatus === "proposed" && view.approvedEarlierVersion && (
            <p className="mt-2 text-xs text-warn-200">{t("arbitration.criteria.changedAfterApproval")}</p>
          )}
          {view.criteriaStatus === "proposed" && (
            <p className="mt-2 text-[11px] text-tone-500">
              {revising ? t("arbitration.criteria.revisionHint") : t("arbitration.criteria.hint")}
            </p>
          )}
        </div>
      )}

      {view?.ruling && !view.ruling.binding && !view.ruling.appealed && !view.closed && (
        <div className="space-y-2 rounded-xl border border-tone-white/10 p-3 text-xs text-tone-300">
          <p>
            {t("arbitration.ruling.pending", {
              verdict: verdictLabel(view.ruling.verdict),
            })}
          </p>
          <p className="text-[11px] text-tone-500">{t("arbitration.ruling.hint")}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {(Object.keys(view.approvals) as Speaker[]).map((side) => (
              <span key={side}>
                {roleLabel(side)}:{" "}
                {view.ruling?.acceptedBy.includes(side) ? t("arbitration.ruling.accepted") : t("arbitration.criteria.waiting")}
              </span>
            ))}
            {!view.ruling.acceptedBy.includes(view.role) && (
              <button
                type="button"
                onClick={() => void approve(view.ruling?.rulingId)}
                disabled={busy}
                className="w-full cursor-pointer rounded-xl border border-accent-300/40 px-3 py-2 sm:ml-auto sm:w-auto sm:py-1.5 text-sm font-semibold text-accent-100 transition hover:bg-emerald-400/10 disabled:opacity-50"
              >
                {t("arbitration.ruling.accept")}
              </button>
            )}
          </div>
        </div>
      )}

      {view?.closed && (
        <p className="rounded-xl border border-accent-300/20 bg-emerald-400/5 p-3 text-sm text-tone-100">
          {t("arbitration.closed")}
        </p>
      )}

      {view && !view.closed && view.messagesLeft === 0 && (
        <p className="rounded-xl border border-tone-white/10 p-3 text-xs text-tone-300">{t("arbitration.limitReached")}</p>
      )}

      {view && !view.closed && view.messagesLeft > 0 && (
        <div className="space-y-2">
          <textarea
            className={`${inputClass} min-h-[80px]`}
            placeholder={
              pendingRuling
                ? t("arbitration.placeholder.ruling")
                : view.criteriaStatus === "proposed"
                  ? t("arbitration.placeholder.criteria")
                  : view.criteriaAgreed
                    ? t("arbitration.placeholder.check")
                    : t("arbitration.placeholder.start")
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer text-xs font-semibold text-tone-300 hover:text-accent-100">
              {t("arbitration.attachPhoto")}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  const converted = await Promise.all(files.map(toJudgeImage));
                  setImages((prev) => [...prev, ...converted].slice(0, 4));
                }}
              />
            </label>
            {images.length > 0 && (
              <button type="button" onClick={() => setImages([])} className="cursor-pointer text-xs text-tone-400">
                {t("arbitration.attached", { count: images.length })}
              </button>
            )}
            {view.messagesLeft <= FEW_MESSAGES_LEFT && (
              <span className="ml-auto text-[11px] text-tone-500">{t("arbitration.messagesLeft", { count: view.messagesLeft })}</span>
            )}
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || (!text.trim() && images.length === 0)}
              className={`${view.messagesLeft <= FEW_MESSAGES_LEFT ? "" : "ml-auto "}cursor-pointer rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {view.messages.length === 0 && !pending ? t("arbitration.sendFirst") : t("arbitration.sendReply")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

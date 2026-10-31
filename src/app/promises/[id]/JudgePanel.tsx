"use client";

import { useCallback, useEffect, useState } from "react";
import { formatKyivDate, type JudgeImage, type JudgePhase, type Speaker } from "@/lib/ai/judge";
import { toJudgeImage } from "@/lib/ai/judgeImage";
import { requireSupabase } from "@/lib/supabaseClient";

// Lab: Dreddi, the AI judge, on a real promise. Renders nothing unless the server has LAB_ENABLED=true.
// Internal only, so the copy is not translated.

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
  created_at: string;
};

type CaseView = {
  role: Speaker;
  criteria: string[];
  criteriaStatus: "none" | "draft" | "proposed" | "agreed";
  criteriaAgreed: boolean;
  proposalId: string | null;
  // The sides that must approve, and whether each one has.
  approvals: Partial<Record<Speaker, boolean>>;
  // Sides that were called and have not answered yet; overdue: Dreddi may rule without them.
  awaiting: { role: Speaker; since: string; until: string; overdue: boolean }[];
  promiseTitle: string;
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

const CRITERIA_STATUS_LABELS: Record<CaseView["criteriaStatus"], string> = {
  none: "",
  draft: "ще уточнюються",
  proposed: "пропозиція Дредді",
  agreed: "погоджено",
};

const ROLE_LABELS: Record<CaseMessage["author_role"], string> = {
  promisor: "Виконавець",
  counterparty: "Інша сторона",
  judge: "Дредді",
};
const VERDICT_LABELS = { kept: "Дотримано", not_kept: "Не дотримано", undecided: "Ще не вирішено" } as const;
const VERDICT_CLASSES = {
  kept: "bg-emerald-300/10 text-accent-100",
  not_kept: "bg-rose-300/10 text-alert-100",
  undecided: "bg-tone-200/10 text-tone-200",
} as const;

const VISIBLE_MESSAGES = 4;

const inputClass =
  "w-full rounded-xl border border-tone-white/10 bg-tone-white/5 px-3 py-2 text-sm text-tone-white outline-none focus:border-accent-300/60";

export function JudgePanel({ promiseId }: { promiseId: string }) {
  const [view, setView] = useState<CaseView | null>(null);
  const [phase, setPhase] = useState<JudgePhase>("criteria");
  const [text, setText] = useState("");

  const [showAll, setShowAll] = useState(false);
  const [images, setImages] = useState<JudgeImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summonCopied, setSummonCopied] = useState(false);

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
    // The stage follows the case: agreed criteria (or an earlier skip) mean checking from then on.
    setPhase(next.criteriaAgreed || next.messages.some((message) => message.phase === "verdict") ? "verdict" : "criteria");
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      const res = await call().catch(() => null);
      // 404: the lab is off. 403: not a side of this promise. Either way, no panel.
      if (!active || !res || res.status === 404 || res.status === 403) return;
      const body = await res.json();
      if (!active) return;
      if (res.ok) applyView(body as CaseView);
      else setError(body.error ?? `HTTP ${res.status}`);
    })();
    return () => {
      active = false;
    };
  }, [call]);

  // Ready-to-send text for a messenger, with a link straight to this arbitration block.
  const copySummons = async (until?: string) => {
    if (!view) return;
    const link = `${window.location.origin}${window.location.pathname}#arbitration`;
    const by = until ? ` до ${formatKyivDate(new Date(until))}` : "";
    const message = `Справа «${view.promiseTitle}» відкрита в арбітражі Dreddi. Дредді чекає вашої позиції${by}: ${link}`;
    try {
      await navigator.clipboard.writeText(message);
      setSummonCopied(true);
      window.setTimeout(() => setSummonCopied(false), 2500);
    } catch {
      setError("Не вдалося скопіювати виклик");
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
      if (!res) throw new Error("Увійдіть знову");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      applyView(body as CaseView);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!text.trim() && images.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await call({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, images, phase }),
      });
      if (!res) throw new Error("Увійдіть знову");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      applyView(body as CaseView);
      setText("");
      setImages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!view && !error) return null;

  // Only the latest messages show by default; Dreddi still gets the whole case from the server.
  const messages = view?.messages ?? [];
  const visibleMessages = showAll ? messages : messages.slice(-VISIBLE_MESSAGES);
  const hiddenCount = messages.length - visibleMessages.length;
  const pendingRuling = Boolean(view?.ruling && !view.ruling.binding && !view.ruling.appealed && !view.closed);

  return (
    <section
      id="arbitration"
      className="scroll-mt-24 space-y-4 rounded-2xl border border-accent-300/20 bg-tone-white/[0.03] p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-tone-white">
          Арбітраж
          <span className="rounded-full border border-accent-300/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-200">
            бета
          </span>
        </h2>
        {view && <p className="text-xs text-tone-400">Ви тут: {ROLE_LABELS[view.role].toLowerCase()}</p>}
      </header>

      {view && "counterparty" in view.approvals && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-tone-300">
          {view.awaiting
            .filter((item) => item.role !== view.role)
            .map((item) => (
              <span key={item.role}>
                {ROLE_LABELS[item.role]}: відповіді ще немає,{" "}
                {item.overdue
                  ? "строк минув, Дредді може винести рішення заочно"
                  : `строк до ${formatKyivDate(new Date(item.until))}`}
              </span>
            ))}
          <button
            type="button"
            onClick={() => void copySummons(view.awaiting.find((item) => item.role !== view.role)?.until)}
            className="ml-auto cursor-pointer rounded-xl border border-tone-white/15 px-3 py-1.5 text-xs font-semibold text-tone-200 transition hover:border-accent-300/40 hover:text-accent-100"
          >
            {summonCopied ? "Виклик скопійовано" : "Скопіювати виклик"}
          </button>
        </div>
      )}

      {view && view.messages.length === 0 && (
        <p className="text-sm text-tone-300">
          Справа ще порожня. Почніть з того, як ви доведете виконання, і Дредді погодить критерії.
        </p>
      )}

      <div className="space-y-3">
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full cursor-pointer rounded-xl border border-dashed border-tone-white/15 py-2 text-xs text-tone-400 transition hover:text-accent-100"
          >
            Показати ранні повідомлення ({hiddenCount})
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
              {ROLE_LABELS[message.author_role]}
              {message.author_name ? ` · ${message.author_name}` : ""} · {formatKyivDate(new Date(message.created_at))}
            </p>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.evidence_notes.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-tone-400">
                {message.evidence_notes.map((note) => (
                  <li key={note}>Доказ: {note}</li>
                ))}
              </ul>
            )}
            {message.verdict && (
              <div className="mt-2 space-y-1">
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${VERDICT_CLASSES[message.verdict]}`}>
                  {VERDICT_LABELS[message.verdict]}
                  {message.in_absentia ? " · заочно" : ""}
                  {message.confidence !== null ? ` · впевненість ${Math.round(message.confidence * 100)}%` : ""}
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
                {message.model} · {message.input_tokens} вх. + {message.output_tokens} вих. токенів
              </p>
            )}
          </div>
        ))}
        {busy && <p className="text-xs text-tone-400">Дредді розглядає справу…</p>}
        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-danger-200">{error}</p>}
      </div>

      {view && view.criteria.length > 0 && (
        <div className="rounded-xl border border-accent-300/20 bg-emerald-400/5 p-3">
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-accent-200">
            Критерії виконання · {CRITERIA_STATUS_LABELS[view.criteriaStatus]}
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
                  {ROLE_LABELS[side]}: {approved ? "погоджено ✓" : "чекаємо"}
                </span>
              ))}
              {!view.approvals[view.role] && (
                <button
                  type="button"
                  onClick={() => void approve(view.proposalId)}
                  disabled={busy}
                  className="ml-auto cursor-pointer rounded-xl border border-accent-300/40 px-3 py-1.5 text-sm font-semibold text-accent-100 transition hover:bg-emerald-400/10 disabled:opacity-50"
                >
                  Погоджую критерії
                </button>
              )}
            </div>
          )}
          {view.criteriaStatus === "proposed" && (
            <p className="mt-2 text-[11px] text-tone-500">
              Щось не так? Напишіть Дредді нижче, і він запропонує нову версію. Критерії зафіксуються, коли їх
              погодять усі сторони, і після цього змінити їх не можна.
            </p>
          )}
        </div>
      )}

      {view?.ruling && !view.ruling.binding && !view.ruling.appealed && !view.closed && (
        <div className="space-y-2 rounded-xl border border-tone-white/10 p-3 text-xs text-tone-300">
          <p>
            Рішення «{VERDICT_LABELS[view.ruling.verdict]}» набере сили, коли його приймуть обидві сторони або{" "}
            {formatKyivDate(new Date(view.ruling.bindsAt))}, якщо ніхто не оскаржить. Тоді зміниться статус обіцянки.
          </p>
          <p className="text-[11px] text-tone-500">
            Не згодні? Напишіть Дредді нижче, чому, і додайте докази. Нове повідомлення означає оскарження, і Дредді
            перегляне справу.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {(Object.keys(view.approvals) as Speaker[]).map((side) => (
              <span key={side}>
                {ROLE_LABELS[side]}: {view.ruling?.acceptedBy.includes(side) ? "прийнято ✓" : "чекаємо"}
              </span>
            ))}
            {!view.ruling.acceptedBy.includes(view.role) && (
              <button
                type="button"
                onClick={() => void approve(view.ruling?.rulingId)}
                disabled={busy}
                className="ml-auto cursor-pointer rounded-xl border border-accent-300/40 px-3 py-1.5 text-sm font-semibold text-accent-100 transition hover:bg-emerald-400/10 disabled:opacity-50"
              >
                Приймаю рішення
              </button>
            )}
          </div>
        </div>
      )}

      {view?.closed && (
        <p className="rounded-xl border border-accent-300/20 bg-emerald-400/5 p-3 text-sm text-tone-100">
          Справу закрито: статус обіцянки остаточний.
        </p>
      )}

      {view && !view.closed && (
        <div className="space-y-2">
          <textarea
            className={`${inputClass} min-h-[80px]`}
            placeholder={
              pendingRuling
                ? "Не згодні з рішенням? Напишіть чому й додайте докази"
                : view.criteriaStatus === "proposed"
                  ? "Не згодні з критеріями? Напишіть, що змінити"
                  : phase === "criteria"
                    ? "Наприклад: як я доведу, що виконав?"
                    : "Розкажіть, що зроблено або що не так, і додайте докази"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer text-xs font-semibold text-tone-300 hover:text-accent-100">
              + Фото або скріншот
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
                Прикріплено: {images.length} (прибрати)
              </button>
            )}
            {/* Before anything is agreed or checked, the side may still pick the stage. */}
            {view && !view.criteriaAgreed && !view.messages.some((message) => message.phase === "verdict") && (
              <button
                type="button"
                onClick={() => setPhase(phase === "criteria" ? "verdict" : "criteria")}
                className="cursor-pointer text-xs text-tone-400 hover:text-accent-100"
              >
                {phase === "criteria" ? "Перейти одразу до перевірки" : "Повернутись до критеріїв"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || (!text.trim() && images.length === 0)}
              className="ml-auto cursor-pointer rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {view.messages.length === 0 ? "Звернутись до Дредді" : "Відповісти"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

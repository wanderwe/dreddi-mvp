"use client";

import { useState } from "react";
import type {
  CriteriaResult,
  Speaker,
  VerdictResult,
  JudgeImage,
  JudgePhase,
  JudgeTurn,
} from "@/lib/ai/judge";

// Lab prototype UI for the AI judge. Internal only, so the copy is not translated.

type Usage = { inputTokens: number; outputTokens: number; costUsd: number; model?: string };
type LogEntry = JudgeTurn & { phase: JudgePhase; usage?: Usage; verdict?: VerdictResult };

const SPEAKER_LABELS: Record<Speaker, string> = { promisor: "Виконавець", counterparty: "Інша сторона" };
const VERDICT_LABELS: Record<VerdictResult["verdict"], string> = {
  kept: "Дотримано",
  not_kept: "Не дотримано",
  undecided: "Ще не вирішено",
};
const VERDICT_CLASSES: Record<VerdictResult["verdict"], string> = {
  kept: "bg-emerald-300/10 text-accent-100",
  not_kept: "bg-rose-300/10 text-alert-100",
  undecided: "bg-tone-200/10 text-tone-200",
};

const MAX_IMAGE_SIDE = 1568;

// Shrinks a photo before upload so a phone picture stays well under the request size limit.
const toJudgeImage = async (file: File): Promise<JudgeImage> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { mediaType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) };
};

const formatCost = (usd: number) => `$${usd.toFixed(5)}`;

const inputClass =
  "w-full rounded-xl border border-tone-white/10 bg-tone-white/5 px-3 py-2 text-sm text-tone-white outline-none focus:border-accent-300/60";

export function JudgeLab() {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [deadline, setDeadline] = useState("");
  const [phase, setPhase] = useState<JudgePhase>("criteria");
  const [criteria, setCriteria] = useState<string[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [text, setText] = useState("");
  const [images, setImages] = useState<JudgeImage[]>([]);
  const [speaker, setSpeaker] = useState<Speaker>("promisor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCost = log.reduce((sum, entry) => sum + (entry.usage?.costUsd ?? 0), 0);
  const phaseLog = log.filter((entry) => entry.phase === phase);

  const send = async () => {
    if (!title.trim() || (!text.trim() && images.length === 0)) return;
    const turn: LogEntry = {
      role: "user",
      text: text.trim(),
      images,
      phase,
      speaker,
    };
    const turns = [...phaseLog, turn];
    setLog((prev) => [...prev, turn]);
    setText("");
    setImages([]);
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/lab/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase,
          promise: { title, details, deadline, criteria },
          turns: turns.map(({ role, text: turnText, speaker: turnSpeaker, images: turnImages }) => ({
            role,
            text: turnText,
            speaker: turnSpeaker,
            images: turnImages,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);

      if (phase === "criteria") {
        const result = body.result as CriteriaResult;
        if (result.criteria.length) setCriteria(result.criteria);
        setLog((prev) => [
          ...prev,
          { role: "assistant", text: result.reply, phase, usage: { ...body.usage, model: body.model } },
        ]);
      } else {
        const result = body.result as VerdictResult;
        setLog((prev) => [
          ...prev,
          { role: "assistant", text: result.reply, phase, usage: { ...body.usage, model: body.model }, verdict: result },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setPhase("criteria");
    setCriteria([]);
    setLog([]);
    setError(null);
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-accent-200">Лабораторія</p>
        <h1 className="text-3xl font-semibold text-tone-white">AI-суддя</h1>
        <p className="text-sm text-tone-300">
          Суддя погоджує критерії, а потім перевіряє докази. Якщо пише лише виконавець, він перевіряє його сам; якщо
          висловилась і інша сторона, вислуховує обох.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-tone-white/10 bg-tone-white/5 p-4">
        <input
          className={inputClass}
          placeholder="Обіцянка, наприклад: Пробігти напівмарафон до 1 квітня"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={log.length > 0}
        />
        <textarea
          className={`${inputClass} min-h-[60px]`}
          placeholder="Деталі (необовʼязково)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          disabled={log.length > 0}
        />
        <input
          className={inputClass}
          placeholder="Дедлайн (необовʼязково), наприклад: 1 квітня 2027"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          disabled={log.length > 0}
        />
      </section>

      <section className="flex flex-wrap items-center gap-2 text-sm">
        {(["criteria", "verdict"] as const).map((value, index) => (
          <button
            key={value}
            type="button"
            onClick={() => setPhase(value)}
            disabled={value === "verdict" && criteria.length === 0}
            className={`cursor-pointer rounded-full border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40 ${
              phase === value ? "border-accent-300/50 text-accent-100" : "border-tone-white/10 text-tone-300"
            }`}
          >
            {index + 1}. {value === "criteria" ? "Критерії" : "Перевірка"}
          </button>
        ))}
        <span className="ml-auto text-xs text-tone-400">Разом: {formatCost(totalCost)}</span>
        <button type="button" onClick={reset} className="cursor-pointer text-xs text-tone-400 hover:text-tone-100">
          Почати знову
        </button>
      </section>

      {criteria.length > 0 && (
        <section className="rounded-2xl border border-accent-300/20 bg-emerald-400/5 p-4">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-accent-200">Критерії виконання</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-tone-100">
            {criteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        {phaseLog.map((entry, index) => (
          <div
            key={index}
            className={`rounded-2xl border p-3 text-sm ${
              entry.role === "assistant"
                ? "border-accent-300/20 bg-tone-white/5 text-tone-100"
                : "ml-8 border-tone-white/10 text-tone-200"
            }`}
          >
            <p className="mb-1 text-xs text-tone-400">
              {entry.role === "assistant"
                ? "AI-суддя"
                : entry.speaker
                  ? SPEAKER_LABELS[entry.speaker]
                  : "Ви"}
            </p>
            {entry.text && <p className="whitespace-pre-wrap">{entry.text}</p>}
            {entry.images && entry.images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {entry.images.map((image, imageIndex) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={imageIndex}
                    src={`data:${image.mediaType};base64,${image.data}`}
                    alt=""
                    className="h-24 rounded-lg object-cover"
                  />
                ))}
              </div>
            )}
            {entry.verdict && (
              <div className="mt-2 space-y-1">
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${VERDICT_CLASSES[entry.verdict.verdict]}`}>
                  {VERDICT_LABELS[entry.verdict.verdict]} · впевненість {Math.round(entry.verdict.confidence * 100)}%
                </span>
                {entry.verdict.reasons.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-tone-300">
                    {entry.verdict.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {entry.usage && (
              <p className="mt-2 text-[11px] text-tone-500">
                {entry.usage.model} · {entry.usage.inputTokens} вх. + {entry.usage.outputTokens} вих. токенів ·{" "}
                {formatCost(entry.usage.costUsd)}
              </p>
            )}
          </div>
        ))}
        {busy && <p className="text-xs text-tone-400">Думає…</p>}
        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-danger-200">{error}</p>}
      </section>

      <section className="space-y-2 rounded-2xl border border-tone-white/10 bg-tone-white/5 p-3">
        <div className="flex gap-2 text-xs">
          {(["promisor", "counterparty"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSpeaker(value)}
              className={`cursor-pointer rounded-full border px-3 py-1 ${
                speaker === value ? "border-accent-300/50 text-accent-100" : "border-tone-white/10 text-tone-300"
              }`}
            >
              Пише: {SPEAKER_LABELS[value]}
            </button>
          ))}
        </div>
        <textarea
          className={`${inputClass} min-h-[80px]`}
          placeholder={
            phase === "criteria"
              ? "Напишіть боту, наприклад: допоможи сформулювати, що вважатиметься виконанням"
              : "Розкажіть, що зроблено, і додайте докази"
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
                setImages((prev) => [...prev, ...converted]);
              }}
            />
          </label>
          {images.length > 0 && (
            <button type="button" onClick={() => setImages([])} className="cursor-pointer text-xs text-tone-400">
              Прикріплено: {images.length} (прибрати)
            </button>
          )}
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy || !title.trim() || (!text.trim() && images.length === 0)}
            className="ml-auto cursor-pointer rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Надіслати
          </button>
        </div>
      </section>
    </main>
  );
}

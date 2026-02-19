import Link from "next/link";
import { Bell, CheckCircle2, MoveRight } from "lucide-react";

import type { LandingCopy } from "@/lib/landingCopy";

type UseCasesSectionProps = {
  copy: LandingCopy["useDreddi"];
};

const highlightText = (text: string, words: string[]) => {
  if (!words.length) return text;

  const escapedWords = words.map((word) =>
    word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const matcher = new RegExp(`(${escapedWords.join("|")})`, "giu");
  const parts = text.split(matcher);

  return parts.map((part, index) => {
    const normalizedPart = part.toLocaleLowerCase();
    const isHighlighted = words.some(
      (word) => word.toLocaleLowerCase() === normalizedPart
    );

    if (!isHighlighted) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <span key={`${part}-${index}`} className="text-emerald-200">
        {part}
      </span>
    );
  });
};

export function UseCasesSection({ copy }: UseCasesSectionProps) {
  return (
    <section className="relative mx-auto -mt-8 w-full max-w-6xl px-4 pb-14 sm:-mt-12 sm:px-6 sm:pb-20">
      <div
        className="pointer-events-none absolute inset-x-0 -top-16 h-28 bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative space-y-10 sm:space-y-14">
        <div className="space-y-3 text-center sm:text-left">
          <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200 sm:text-sm">
            {copy.eyebrow}
          </span>
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">{copy.title}</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_auto_1.05fr] lg:items-start">
          <div className="rounded-2xl bg-slate-950/20 p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
              {copy.beforeTitle}
            </h3>
            <ul className="mt-4 space-y-3 text-[15px] leading-7 text-slate-400/90">
              {copy.beforeBullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-slate-500/70"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden h-full items-center justify-center lg:flex">
            <div className="relative flex h-full min-h-56 items-center px-3">
              <div className="h-full w-px bg-gradient-to-b from-transparent via-emerald-300/50 to-transparent" />
              <MoveRight className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-emerald-200/70" />
            </div>
          </div>


          <div className="flex items-center justify-center lg:hidden">
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />
          </div>
          <div className="space-y-4 rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-emerald-500/[0.1] via-emerald-500/[0.06] to-slate-900/50 p-5 shadow-lg shadow-emerald-900/10 sm:p-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200">
              {copy.afterTitle}
            </h3>
            <ul className="space-y-2.5 text-[15px] leading-7 text-slate-100">
              {copy.afterBullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-300/80"
                  />
                  <span>{highlightText(item, copy.highlightWords)}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2.5">
              <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Dreddi</span>
                  <span className="text-emerald-200">{copy.previewDelta}</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-sm text-slate-100">
                  <span className="font-medium">25.04 · 19:00</span>
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-100">
                    {copy.demoStatus}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200">
                <Bell className="h-3.5 w-3.5 text-emerald-200" />
                <span>{copy.demoReminder}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
                  {copy.previewDelta}
                </span>
                <span className="text-slate-300">{copy.demoProfileAdded}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 text-center">
          <p className="text-lg text-slate-100 sm:text-xl">{copy.ctaLine}</p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/promises/new"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              {copy.ctaPrimary}
            </Link>
            <Link
              href="/u"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/5"
            >
              {copy.ctaSecondary}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { CalendarCheck2 } from "lucide-react";

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
        <div className="space-y-3 text-center">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            {copy.title}
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <article className="rounded-3xl border border-white/10 bg-slate-950/30 p-5 sm:p-6">
            <h3 className="text-xl font-semibold text-slate-300">{copy.beforeTitle}</h3>
            <ul className="mt-5 space-y-3.5 pl-1 text-base leading-7 text-slate-400/90">
              {copy.beforeBullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-slate-500/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-emerald-300/20 bg-emerald-500/[0.09] p-5 shadow-lg shadow-emerald-900/10 sm:p-6">
            <h3 className="text-xl font-semibold text-white">{copy.afterTitle}</h3>
            <ul className="mt-5 space-y-3.5 pl-1 text-base leading-7 text-slate-100">
              {copy.afterBullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
                  <span>{highlightText(item, copy.highlightWords)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 max-w-xs rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Dreddi</span>
                <span className="text-emerald-200">{copy.previewDelta}</span>
              </div>
              <div className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-slate-200">
                <div className="flex items-center gap-2">
                  <CalendarCheck2 className="h-4 w-4 text-emerald-200" />
                  <span className="font-medium">25.04 · 19:00</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{copy.previewNote}</p>
              </div>
            </div>
          </article>
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

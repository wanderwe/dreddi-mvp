import Link from "next/link";

import type { LandingCopy } from "@/lib/landingCopy";

type ReputationSectionProps = {
  copy: LandingCopy["reputation"];
  scoreCopy: LandingCopy["score"];
};

export function ReputationSection({ copy, scoreCopy }: ReputationSectionProps) {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-16">
      <div
        className="pointer-events-none absolute inset-x-0 -top-16 h-28 bg-gradient-to-b from-sky-400/25 via-sky-400/10 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative space-y-8 sm:space-y-10">
        <div className="space-y-3 text-center sm:text-left">
          <span className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-200 sm:text-sm">
            {copy.label}
          </span>
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">{copy.title}</h2>
          <p className="max-w-3xl text-sm text-slate-300 sm:text-base">{copy.subtitle}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <ul className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-[15px] leading-7 text-slate-200 sm:p-6">
            {copy.bullets.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-sky-300/80" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-3xl bg-gradient-to-br from-white/12 via-white/6 to-slate-900/45 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.6)] ring-1 ring-emerald-500/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
              {copy.cardLabel}
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-200/80">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-100">
                {scoreCopy.cards.confirmed}
              </span>
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-100">
                {scoreCopy.cards.disputed}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">
                {scoreCopy.shortLabel}
              </span>
            </div>

            <p className="mt-4 text-sm text-slate-300">{copy.cardMicrocopy}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/u"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
              >
                {copy.ctaPrimary}
              </Link>
              <Link
                href="/promises"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/5"
              >
                {copy.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";

import type { LandingCopy } from "@/lib/landingCopy";

type LandingNarrativeSectionsProps = {
  copy: LandingCopy["narrative"];
  scoreCopy: LandingCopy["score"];
};

export function LandingNarrativeSections({ copy, scoreCopy }: LandingNarrativeSectionsProps) {
  return (
    <section className="relative mx-auto w-full max-w-6xl space-y-12 px-4 pb-16 pt-2 sm:space-y-14 sm:px-6 sm:pb-20">
      <div
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        aria-hidden
      />

      <div className="grid gap-8 border-b border-white/10 pb-10 sm:gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">{copy.reality.title}</h2>
          <ul className="mt-5 space-y-3 text-sm text-slate-300 sm:text-base">
            {copy.reality.bullets.map((item) => (
              <li key={item} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-3xl font-medium leading-tight text-slate-100 sm:text-4xl">{copy.reality.statement}</p>
      </div>

      <div className="border-b border-white/10 pb-10 text-center">
        <p className="mx-auto max-w-3xl text-2xl font-semibold leading-tight text-white sm:text-3xl">{copy.pivot}</p>
      </div>

      <div className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div>
          <h3 className="text-2xl font-semibold text-white sm:text-3xl">{copy.trust.title}</h3>
          <ul className="mt-6 space-y-3 text-sm text-slate-300 sm:text-base">
            {copy.trust.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <Link
            href="/u"
            className="mt-7 inline-flex items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
          >
            {copy.trust.cta}
          </Link>
        </div>

        <div className="glass-panel rounded-3xl border-white/10 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{copy.trust.cardLabel}</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{scoreCopy.shortLabel}</div>
              <div className="mt-1 text-2xl font-semibold text-white">84</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{scoreCopy.cards.confirmed}</div>
              <div className="mt-1 text-2xl font-semibold text-white">31</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{scoreCopy.cards.disputed}</div>
              <div className="mt-1 text-2xl font-semibold text-white">2</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            {scoreCopy.onTime.label}: <span className="text-slate-200">92%</span>
          </p>
        </div>
      </div>

      <div className="border-b border-white/10 pb-10">
        <ul className="space-y-2 text-sm text-slate-300 sm:text-base">
          {copy.socialEffect.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.audienceTitle}</p>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">{copy.audience.join(" • ")}</p>
      </div>
    </section>
  );
}

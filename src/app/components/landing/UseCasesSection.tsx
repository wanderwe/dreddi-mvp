import Link from "next/link";
import { Bell } from "lucide-react";
import { StatusPill } from "@/app/components/ui/StatusPill";

import type { LandingCopy } from "@/lib/landingCopy";

type UseCasesSectionProps = {
  copy: LandingCopy["useDreddi"];
  scoreCopy: LandingCopy["score"];
};

export function UseCasesSection({ copy, scoreCopy }: UseCasesSectionProps) {
  return (
    <section className="relative mx-auto -mt-8 w-full max-w-6xl px-4 pb-20 sm:-mt-12 sm:px-6 sm:pb-24">
      <div
        className="pointer-events-none absolute inset-x-0 -top-16 h-28 bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative space-y-10 sm:space-y-12">
        <div className="space-y-3 text-center sm:text-left">
          <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200 sm:text-sm">
            {copy.eyebrow}
          </span>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h2>
          <p className="text-sm text-slate-300 sm:text-base">{copy.subtitle}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <ol className="space-y-4">
              {copy.steps.map((step, index) => (
                <li key={step.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-500/10 text-xs font-semibold text-emerald-200">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{step.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-3 rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-emerald-500/[0.1] via-emerald-500/[0.06] to-slate-900/50 p-5 shadow-[0_25px_80px_rgba(15,23,42,0.55)] ring-1 ring-emerald-500/15 sm:p-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Dreddi</span>
                <StatusPill
                  label={copy.demoStatus}
                  tone="attention"
                  marker="none"
                  className="px-2 py-0.5 text-[11px]"
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-sm text-slate-100">
                <span className="font-medium">25.04 · 19:00</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{copy.demoDealLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200">
              <Bell className="h-3.5 w-3.5 text-emerald-200" />
              <span>{copy.demoReminder}</span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200">
              <StatusPill
                label={copy.demoConfirmed}
                tone="success"
                marker="none"
                className="px-2 py-0.5 text-[11px]"
              />
              <span className="text-emerald-200">{copy.demoDelta}</span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
              {copy.demoProfileAdded}
            </div>

            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-200/80">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-100">
                {scoreCopy.cards.confirmed}
              </span>
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-100">
                {scoreCopy.cards.disputed}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">{scoreCopy.shortLabel}</span>
            </div>
          </div>
        </div>

        <div className="space-y-5 text-center">
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

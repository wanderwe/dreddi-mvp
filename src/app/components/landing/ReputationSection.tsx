import { BadgeCheck, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

import type { LandingCopy } from "@/lib/landingCopy";

const stepIcons = [CheckCircle2, BadgeCheck, Sparkles];

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
      <div
        className="pointer-events-none absolute inset-x-8 -top-2 h-px bg-gradient-to-r from-transparent via-sky-300/40 to-transparent"
        aria-hidden
      />

      <div className="relative space-y-8 sm:space-y-10">
        <div className="space-y-3 text-center sm:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-200 sm:text-sm">
            <Sparkles className="h-4 w-4" />
            {copy.label}
          </span>
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            {copy.title}
          </h2>
        </div>

        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <ol className="relative space-y-6 pl-6 text-base text-slate-200/90 sm:space-y-8 sm:text-lg">
            {copy.steps.map((item, index) => {
              const Icon = stepIcons[index] ?? CheckCircle2;

              return (
                <li key={item} className="relative flex items-center gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/30">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              );
            })}
          </ol>

          <div className="rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-slate-900/40 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.6)] ring-1 ring-emerald-500/20">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
                {copy.outcomeTitle}
              </p>
              <h3 className="text-2xl font-semibold text-white">
                {copy.outcomeDescription}
              </h3>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-200/80">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-100">
                {scoreCopy.cards.confirmed}
              </span>
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-100">
                {scoreCopy.cards.disputed}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">
                {scoreCopy.label}
              </span>
            </div>

            <Link
              href="/u"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
            >
              {copy.cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

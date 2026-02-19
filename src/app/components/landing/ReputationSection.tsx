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
    <section className="relative mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6 sm:pb-24">
      <div className="relative space-y-9 sm:space-y-11">
        <div className="space-y-3 text-center sm:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-slate-300 sm:text-xs">
            <Sparkles className="h-4 w-4" />
            {copy.label}
          </span>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            {copy.title}
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="glass-panel rounded-3xl px-5 py-6 sm:px-6 sm:py-7">
            <ol className="space-y-4 text-sm text-slate-200/90 sm:text-base">
              {copy.steps.map((item, index) => {
                const Icon = stepIcons[index] ?? CheckCircle2;

                return (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/30">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="glass-panel rounded-3xl px-5 py-6 sm:px-6 sm:py-7">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                {copy.outcomeTitle}
              </p>
              <h3 className="text-xl font-semibold text-white sm:text-2xl">
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
              className="mt-7 inline-flex items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
            >
              {copy.cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

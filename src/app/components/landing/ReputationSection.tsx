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
    <section className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-2 sm:px-6 sm:pb-24 sm:pt-4">
      <div className="space-y-7 sm:space-y-9">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            <Sparkles className="h-3.5 w-3.5" />
            {copy.label}
          </span>
          <h2 className="max-w-2xl text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="glass-panel rounded-3xl p-6 sm:p-7">
            <ol className="space-y-3.5 text-sm text-slate-200 sm:text-base">
              {copy.steps.map((item, index) => {
                const Icon = stepIcons[index] ?? CheckCircle2;

                return (
                  <li key={item} className="flex items-start gap-3.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/6 text-sky-200 ring-1 ring-white/10">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="glass-panel rounded-3xl p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{copy.outcomeTitle}</p>
            <h3 className="mt-3 max-w-md text-xl font-semibold text-white sm:text-2xl">{copy.outcomeDescription}</h3>

            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-200/80">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{scoreCopy.cards.confirmed}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{scoreCopy.cards.disputed}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{scoreCopy.label}</span>
            </div>

            <Link
              href="/u"
              className="mt-7 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
            >
              {copy.cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

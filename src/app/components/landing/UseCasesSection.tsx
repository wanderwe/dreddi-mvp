import { Briefcase, CheckCircle2, Clock, Coins, MessageSquare, Scale } from "lucide-react";

import type { LandingCopy } from "@/lib/landingCopy";

const triggerIcons = [Clock, Coins, MessageSquare, Scale];
const scenarioIcons = [Briefcase, CheckCircle2, Scale];

type UseCasesSectionProps = {
  copy: LandingCopy["useDreddi"];
};

export function UseCasesSection({ copy }: UseCasesSectionProps) {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-6">
      <div className="space-y-7 sm:space-y-9">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {copy.label}
          </span>
          <h2 className="max-w-2xl text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-panel rounded-3xl p-6 sm:p-7">
            <ul className="space-y-4 text-sm text-slate-200 sm:text-base">
              {copy.bullets.map((item, index) => {
                const Icon = triggerIcons[index] ?? CheckCircle2;

                return (
                  <li key={item} className="flex items-start gap-3.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/6 text-emerald-200 ring-1 ring-white/10">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="glass-panel rounded-3xl p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{copy.noteTitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{copy.framing}</p>

            <div className="mt-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{copy.scenariosTitle}</p>
              <div className="space-y-2.5">
                {copy.scenarios.slice(0, 3).map((item, index) => {
                  const Icon = scenarioIcons[index] ?? Briefcase;

                  return (
                    <div key={item} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                      <span className="inline-flex items-center gap-2 text-sm text-slate-200">
                        <Icon className="h-4 w-4 text-emerald-200" />
                        {item}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80" aria-hidden />
                        {copy.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

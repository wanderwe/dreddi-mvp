import {
  Briefcase,
  CheckCircle2,
  Clock,
  Coins,
  Handshake,
  Home,
  MessageSquare,
  Rocket,
  Scale,
  Wrench,
} from "lucide-react";

import type { LandingCopy } from "@/lib/landingCopy";

const triggerIcons = [Clock, Coins, MessageSquare, Scale];
const scenarioIcons = [Briefcase, Handshake, Home, Wrench, Rocket];

type UseCasesSectionProps = {
  copy: LandingCopy["useDreddi"];
};

export function UseCasesSection({ copy }: UseCasesSectionProps) {
  return (
    <section className="relative mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8">
      <div className="relative space-y-9 sm:space-y-11">
        <div className="space-y-3 text-center sm:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-slate-300 sm:text-xs">
            <CheckCircle2 className="h-4 w-4" />
            {copy.label}
          </span>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            {copy.title}
          </h2>
        </div>

        <div className="glass-panel rounded-3xl px-5 py-6 sm:px-7 sm:py-7">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div className="space-y-6">
              <ul className="space-y-4 text-sm text-slate-100/90 sm:text-base">
                {copy.bullets.map((item, index) => {
                  const Icon = triggerIcons[index] ?? CheckCircle2;

                  return (
                    <li key={item} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-300/90">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                  {copy.noteTitle}
                </p>
                <p className="mt-2.5 max-w-xl text-sm text-slate-200/80">{copy.framing}</p>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {copy.scenariosTitle}
              </div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {copy.scenarios.map((item, index) => {
                  const Icon = scenarioIcons[index] ?? Briefcase;

                  return (
                    <div
                      key={item}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-emerald-200">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span>{item}</span>
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

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
    <section className="relative mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 sm:pb-14 -mt-8 sm:-mt-12">
      <div
        className="pointer-events-none absolute inset-x-0 -top-16 h-28 bg-gradient-to-b from-emerald-500/30 via-emerald-500/10 to-transparent blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-6 -top-2 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
        aria-hidden
      />

      <div className="relative space-y-8 sm:space-y-10">
        <div className="space-y-3 text-center sm:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200 sm:text-sm">
            <CheckCircle2 className="h-4 w-4" />
            {copy.label}
          </span>
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            {copy.title}
          </h2>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-8">
            <ul className="mx-auto max-w-xl space-y-6 text-base text-slate-100/90 sm:space-y-8 sm:text-lg">
              {copy.bullets.map((item, index) => {
                const Icon = triggerIcons[index] ?? CheckCircle2;

                return (
                  <li key={item} className="flex items-center gap-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                );
              })}
            </ul>

            <div className="rounded-3xl bg-white/5 p-5 text-sm text-slate-300/90 shadow-inner shadow-black/30">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
                {copy.noteTitle}
              </p>
              <p className="mt-3 text-sm text-slate-200/80">{copy.framing}</p>
            </div>
          </div>

          <div className="lg:mt-10">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
              {copy.scenariosTitle}
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {copy.scenarios.map((item, index) => {
                const Icon = scenarioIcons[index] ?? Briefcase;

                return (
                  <div
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs text-slate-300"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-emerald-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

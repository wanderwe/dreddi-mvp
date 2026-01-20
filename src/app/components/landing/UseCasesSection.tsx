import {
  Briefcase,
  CheckCircle2,
  Clock,
  Coins,
  Handshake,
  Home,
  Info,
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
    <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
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
          <p className="mx-auto max-w-2xl text-sm text-slate-300 sm:mx-0 sm:text-base">
            {copy.lead}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="group rounded-3xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/40 transition hover:border-emerald-400/30">
            <div className="flex items-center gap-3 text-sm font-semibold text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              {copy.triggersTitle}
            </div>
            <ul className="mt-5 space-y-3 text-sm text-slate-200/90">
              {copy.bullets.map((item, index) => {
                const Icon = triggerIcons[index] ?? CheckCircle2;

                return (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-white/5 bg-black/20 px-3 py-3"
                  >
                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-emerald-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="group rounded-3xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/40 transition hover:border-emerald-400/30">
            <div className="flex items-center gap-3 text-sm font-semibold text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-emerald-200">
                <Briefcase className="h-4 w-4" />
              </span>
              {copy.scenariosTitle}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {copy.scenarios.map((item, index) => {
                const Icon = scenarioIcons[index] ?? Briefcase;

                return (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 px-3 py-3 text-xs text-slate-200/90"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-emerald-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300/90 italic">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-emerald-200">
            <Info className="h-4 w-4" />
          </span>
          <p>
            <span className="font-semibold text-slate-200">{copy.noteTitle}</span>{" "}
            {copy.framing}
          </p>
        </div>
      </div>
    </section>
  );
}

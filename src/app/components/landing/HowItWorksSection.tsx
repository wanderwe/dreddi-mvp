import { Bell, Check, CheckCircle2, HandHeart, PlusCircle } from "lucide-react";

import type { LandingCopy } from "@/lib/landingCopy";

type HowItWorksSectionProps = {
  copy: LandingCopy["howItWorks"];
};

export function HowItWorksSection({ copy }: HowItWorksSectionProps) {
  return (
    <section className="relative mx-auto -mt-8 w-full max-w-6xl px-4 pb-14 sm:-mt-12 sm:px-6 sm:pb-16">
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
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">{copy.title}</h2>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">{copy.subtitle}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
          <ol className="space-y-4">
            {copy.timeline.map((step, index) => (
              <li
                key={step}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-slate-100/90"
              >
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-500/30">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed sm:text-base">{step}</p>
              </li>
            ))}
          </ol>

          <div className="space-y-3">
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_60px_rgba(8,15,30,0.4)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">{copy.cards.agreement.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">{copy.cards.agreement.meta}</p>
                </div>
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] text-amber-100">
                  {copy.cards.agreement.status}
                </span>
              </div>
              <button
                type="button"
                className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200"
                disabled
              >
                {copy.cards.agreement.cta}
              </button>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_60px_rgba(8,15,30,0.35)]">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                <Bell className="h-3.5 w-3.5 text-emerald-200" />
                {copy.cards.reminder.label}
              </p>
              <p className="mt-3 text-sm text-slate-100/90">{copy.cards.reminder.text}</p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.09] via-white/[0.04] to-slate-900/40 p-4 shadow-[0_24px_70px_rgba(8,15,30,0.5)]">
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100">
                  <Check className="h-4 w-4" />
                  {copy.cards.result.status}
                </p>
                <p className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-100">
                  <PlusCircle className="h-3.5 w-3.5" />
                  {copy.cards.result.counter}
                </p>
              </div>
              <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-300">
                <HandHeart className="h-3.5 w-3.5 text-emerald-200" />
                {copy.cards.result.profileHint}
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

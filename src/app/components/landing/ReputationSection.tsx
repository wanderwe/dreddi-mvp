import Link from "next/link";
import { BadgeCheck, Clock, Handshake, Link2, ShieldAlert, UserRound } from "lucide-react";

import type { LandingCopy } from "@/lib/landingCopy";

const reputationIcons = [Handshake, Clock, BadgeCheck, ShieldAlert];

type ReputationSectionProps = {
  copy: LandingCopy["reputationModel"];
};

export function ReputationSection({ copy }: ReputationSectionProps) {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
      <div
        className="pointer-events-none absolute inset-x-0 -top-16 h-28 bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-6 -top-2 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"
        aria-hidden
      />

      <div className="relative grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div className="space-y-6 text-center sm:text-left">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200 sm:text-sm">
              <UserRound className="h-4 w-4" />
              {copy.label}
            </span>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              {copy.title}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/40">
            <div className="space-y-5">
              {copy.steps.map((item, index) => {
                const Icon = reputationIcons[index] ?? BadgeCheck;

                return (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-emerald-200 shadow-inner shadow-black/40">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-sm text-slate-300">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 pt-2">
          <div className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-inner shadow-black/40">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-200">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{copy.profileTitle}</p>
                <p className="text-xs text-slate-400">public.dreddi.app/username</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-300">{copy.profileDescription}</p>
            <div className="mt-4 space-y-2 text-sm text-slate-200/90">
              {copy.profileHighlights.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-2"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-300/80" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <Link
                href="/u"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
              >
                {copy.cta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

import type { LandingCopy } from "@/lib/landingCopy";

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
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">{copy.title}</h2>
          <p className="max-w-2xl text-base text-slate-200/80 sm:text-lg">{copy.description}</p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <ul className="space-y-5 text-base text-slate-100/85 sm:text-lg">
            {copy.bullets.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-300/60" aria-hidden />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl bg-gradient-to-br from-white/10 via-white/[0.06] to-slate-900/45 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.58)] ring-1 ring-sky-400/20">
            <h3 className="text-lg font-semibold text-white">{copy.profilePreviewTitle}</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-200/90">
              {copy.profilePreviewItems.map((item) => (
                <p key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-200" />
                  {item}
                </p>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-200/80">
              {copy.profilePreviewStats.map((item, index) => (
                <span
                  key={item}
                  className={`rounded-full px-3 py-1 ${
                    index === 0
                      ? "bg-emerald-500/15 text-emerald-100"
                      : index === 1
                        ? "bg-amber-500/15 text-amber-100"
                        : "bg-white/10 text-slate-200"
                  }`}
                >
                  {item}
                </span>
              ))}
              <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">{scoreCopy.shortLabel}</span>
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

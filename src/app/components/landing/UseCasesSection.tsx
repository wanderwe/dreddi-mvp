import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import type { LandingCopy } from "@/lib/landingCopy";

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
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">{copy.title}</h2>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="relative px-1 py-2">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent blur-2xl"
              aria-hidden
            />
            <ul className="relative space-y-6 text-base text-slate-200/85 sm:space-y-7 sm:text-lg">
              {copy.chaosBullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-300/50" aria-hidden />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-white/10 via-white/[0.06] to-slate-900/50 p-6 shadow-[0_20px_65px_rgba(15,23,42,0.58)] ring-1 ring-emerald-500/20">
            <p className="text-sm font-semibold text-white">{copy.clarityTitle}</p>

            <ul className="mt-4 space-y-3 text-sm text-slate-100/90 sm:text-base">
              {copy.clarityBullets.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-xl bg-slate-950/45 p-4 ring-1 ring-white/10">
              <div className="space-y-2 text-xs text-slate-300 sm:text-sm">
                <div>{copy.previewRows.date}</div>
                <div>{copy.previewRows.reminder}</div>
                <div>{copy.previewRows.confirmed}</div>
              </div>
              <div className="mt-3 inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-200">
                {copy.previewRows.plusOne}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {copy.statusTags.map((tag, index) => (
                  <span
                    key={tag}
                    className={`rounded-full px-2.5 py-1 text-[11px] ${
                      index === 0
                        ? "bg-emerald-500/15 text-emerald-100"
                        : index === 1
                          ? "bg-amber-500/15 text-amber-100"
                          : "bg-white/10 text-slate-200"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 border-t border-white/10 pt-8 text-center">
          <p className="text-base text-slate-100/90 sm:text-lg">{copy.transitionLine}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/new"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
            >
              {copy.primaryCta}
            </Link>
            <Link
              href="/u"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <AlertCircle className="mr-2 h-4 w-4 text-slate-300" />
              {copy.secondaryCta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

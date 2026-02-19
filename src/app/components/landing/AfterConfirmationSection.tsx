import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import type { LandingCopy } from "@/lib/landingCopy";

type AfterConfirmationSectionProps = {
  copy: LandingCopy["afterConfirmation"];
};

export function AfterConfirmationSection({ copy }: AfterConfirmationSectionProps) {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-3 sm:px-6 sm:pb-14 sm:pt-4">
      <div
        className="pointer-events-none absolute inset-x-0 -top-10 h-24 bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-6 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:px-7 sm:py-7">
        <div className="grid gap-7 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
          <div>
            <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200 sm:text-xs">
              {copy.eyebrow}
            </span>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl">
              {copy.title}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-base">{copy.subtitle}</p>

            <ul className="mt-5 space-y-3.5">
              {copy.bullets.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-200 sm:text-base">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/10 text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/promises/new"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
              >
                {copy.ctaPrimary}
              </Link>
              {copy.ctaSecondary ? (
                <Link
                  href="/u"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-200"
                >
                  {copy.ctaSecondary}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>

          <div className="flex lg:justify-end">
            <div className="w-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.04] to-slate-900/50 p-5 shadow-[0_20px_45px_rgba(2,6,23,0.45)] sm:max-w-md">
              <div className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
                {copy.highlight.confirmedPill}
              </div>
              <p className="mt-4 text-lg font-semibold text-white sm:text-xl">{copy.highlight.title}</p>
              <p className="mt-2 text-sm text-slate-300">{copy.highlight.hint}</p>
              <div className="mt-5 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <p className="mt-4 text-base font-medium text-emerald-100">{copy.emphasis}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

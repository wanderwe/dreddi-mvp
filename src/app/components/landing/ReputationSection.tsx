import { Dot } from "lucide-react";
import Link from "next/link";

import type { LandingCopy } from "@/lib/landingCopy";

type ReputationSectionProps = {
  copy: LandingCopy["reputation"];
  scoreCopy: LandingCopy["score"];
};

export function ReputationSection({ copy, scoreCopy }: ReputationSectionProps) {
  return (
    <section>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <div className="space-y-4">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
            {copy.label}
          </span>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h2>
          <p className="max-w-xl text-sm text-slate-300 sm:text-base">{copy.description}</p>
          <ul className="space-y-2.5 text-sm text-slate-200 sm:text-base">
            {copy.bullets.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Dot className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/u"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50"
          >
            {copy.cta}
          </Link>
        </div>

        <div className="glass-panel rounded-3xl border border-white/10 px-6 py-6 sm:px-7">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{scoreCopy.demoBadge}</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{scoreCopy.shortLabel}</p>
              <p className="mt-1 text-2xl font-semibold text-white">78</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{scoreCopy.cards.confirmed}</p>
              <p className="mt-1 text-2xl font-semibold text-white">24</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{scoreCopy.cards.disputed}</p>
              <p className="mt-1 text-2xl font-semibold text-white">1</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">{copy.bullets[2]}</p>
        </div>
      </div>
    </section>
  );
}

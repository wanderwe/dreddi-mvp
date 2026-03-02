import { CircleDot, Dot } from "lucide-react";

import type { LandingCopy } from "@/lib/landingCopy";

type UseCasesSectionProps = {
  copy: LandingCopy["useDreddi"];
};

export function UseCasesSection({ copy }: UseCasesSectionProps) {
  return (
    <section>
      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
        <CircleDot className="h-3.5 w-3.5 text-emerald-200" />
        {copy.label}
      </span>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">{copy.problemTitle}</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-200 sm:text-base">
            {copy.problemBullets.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Dot className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-white sm:text-2xl">{copy.effectTitle}</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-200 sm:text-base">
            {copy.effectBullets.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Dot className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-emerald-100 sm:text-base">{copy.effectLine}</p>
        </div>
      </div>
    </section>
  );
}

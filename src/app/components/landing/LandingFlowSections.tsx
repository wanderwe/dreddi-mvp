import Link from "next/link";

import { StatusPill } from "@/app/components/ui/StatusPill";
import type { LandingCopy } from "@/lib/landingCopy";

type LandingFlowSectionsProps = {
  copy: LandingCopy["sections"];
  ctaCopy: LandingCopy["cta"];
};

function SectionHeader({
  label,
  title,
  lead,
}: {
  label: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="space-y-3">
      <span className="inline-flex rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300">
        {label}
      </span>
      <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {lead ? <p className="max-w-2xl text-sm text-slate-300 sm:text-base">{lead}</p> : null}
    </div>
  );
}

export function LandingFlowSections({ copy, ctaCopy }: LandingFlowSectionsProps) {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="space-y-10">
          <SectionHeader label={copy.situation.label} title={copy.situation.title} />
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <ul className="space-y-4 text-base text-slate-200/90 sm:text-lg">
              {copy.situation.triggers.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
                  <span className="bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <div className="glass-panel rounded-2xl border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h3 className="text-base font-semibold text-white">{copy.situation.clearTitle}</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-200 sm:text-base">
                {copy.situation.clearBullets.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="space-y-10">
          <SectionHeader label={copy.howItWorks.label} title={copy.howItWorks.title} />
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-12">
            <div className="space-y-8">
              <ol className="grid gap-3 sm:grid-cols-3">
                {copy.howItWorks.steps.map((step, index) => (
                  <li key={step} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200">
                    <div className="text-xs text-slate-400">{index + 1}</div>
                    <div className="mt-1 font-medium">{step}</div>
                  </li>
                ))}
              </ol>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/promises/new"
                  className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
                >
                  {ctaCopy.createPromise}
                </Link>
                <Link
                  href="/u"
                  className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
                >
                  {copy.howItWorks.exampleProfileCta}
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <div className="glass-panel rounded-2xl border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{copy.howItWorks.previewDealTitle}</p>
                  <StatusPill label={copy.howItWorks.previewDealStatus} tone="neutral" marker="none" className="px-2 py-1 text-xs" />
                </div>
                <p className="mt-2 text-xs text-slate-400">{copy.howItWorks.previewDealMeta}</p>
              </div>
              <div className="glass-panel rounded-2xl border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{copy.howItWorks.previewReminderTitle}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-200">{copy.howItWorks.previewReminderTag}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{copy.howItWorks.previewReminderMeta}</p>
              </div>
              <div className="glass-panel rounded-2xl border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{copy.howItWorks.previewOutcomeTitle}</p>
                  <StatusPill label={copy.howItWorks.previewOutcomeStatus} tone="success" marker="none" className="px-2 py-1 text-xs" />
                </div>
                <p className="mt-2 text-xs text-slate-400">{copy.howItWorks.previewOutcomeMeta}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="space-y-10">
          <SectionHeader label={copy.trustCheck.label} title={copy.trustCheck.title} lead={copy.trustCheck.lead} />
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
            <ul className="space-y-4 text-base text-slate-200/90 sm:text-lg">
              {copy.trustCheck.bullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="glass-panel rounded-2xl border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-slate-900/40 p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{copy.trustCheck.profilePreviewLabel}</p>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">@example</p>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-100">{copy.trustCheck.profilePreviewScore}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full bg-white/10 px-2.5 py-1">{copy.trustCheck.profilePreviewConfirmed}</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1">{copy.trustCheck.profilePreviewDisputed}</span>
                </div>
              </div>
              <Link
                href="/u"
                className="mt-5 inline-flex rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
              >
                {copy.trustCheck.exampleProfileCta}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

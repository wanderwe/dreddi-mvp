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
    <div className="space-y-2.5">
      <span className="inline-flex rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300">
        {label}
      </span>
      <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">{title}</h2>
      {lead ? <p className="max-w-2xl text-sm text-slate-300 sm:text-base">{lead}</p> : null}
    </div>
  );
}

function SectionDivider() {
  return (
    <div
      className="mx-auto h-px w-full max-w-[1100px] bg-gradient-to-r from-transparent via-white/15 to-transparent px-4 sm:px-6"
      aria-hidden
    />
  );
}

export function LandingFlowSections({ copy, ctaCopy }: LandingFlowSectionsProps) {
  return (
    <>
      <section className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6 sm:py-12">
        <div className="space-y-7">
          <SectionHeader label={copy.situation.label} title={copy.situation.title} />
          <div className="grid gap-7 lg:grid-cols-12 lg:items-start lg:gap-8">
            <div className="relative lg:col-span-5">
              <ul className="space-y-3 text-lg leading-tight text-slate-100/90">
                {copy.situation.triggers.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#040712] via-[#040712]/75 to-transparent" />
            </div>

            <div className="glass-panel rounded-2xl border-white/10 bg-white/[0.04] p-5 lg:col-span-7">
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                <div className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  {copy.situation.cardMetaLabel}
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-slate-200">
                  {copy.situation.cardMetaCount}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white">{copy.situation.clearTitle}</h3>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-200 sm:text-base">
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

      <SectionDivider />

      <section className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6 sm:py-12">
        <div className="space-y-7">
          <SectionHeader label={copy.howItWorks.label} title={copy.howItWorks.title} />
          <div className="grid gap-7 lg:grid-cols-12 lg:items-start lg:gap-8">
            <div className="space-y-6 lg:col-span-5">
              <ol className="relative grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="pointer-events-none absolute left-4 right-4 top-4 hidden h-px bg-gradient-to-r from-emerald-300/30 via-emerald-300/50 to-emerald-300/30 sm:block lg:hidden" />
                <div className="pointer-events-none absolute bottom-4 left-4 top-4 hidden w-px bg-gradient-to-b from-emerald-300/30 via-emerald-300/50 to-emerald-300/30 lg:block" />
                {copy.howItWorks.steps.map((step, index) => (
                  <li key={step} className="relative rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-400/10 text-xs text-emerald-100">
                      {index + 1}
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">{step}</div>
                    <div className="mt-1 text-xs text-slate-400">{copy.howItWorks.stepMicrocopy[index]}</div>
                  </li>
                ))}
              </ol>

              <Link
                href="/promises/new"
                className="inline-flex rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
              >
                {ctaCopy.createPromise}
              </Link>
            </div>

            <div className="glass-panel rounded-2xl border-white/10 bg-white/[0.04] p-4 lg:col-span-7">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-white">{copy.howItWorks.previewDealTitle}</p>
                    <p className="text-xs text-slate-400">{copy.howItWorks.previewDealMeta}</p>
                  </div>
                  <StatusPill
                    label={copy.howItWorks.previewDealStatus}
                    tone="neutral"
                    marker="none"
                    className="px-2 py-1 text-xs"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-white">{copy.howItWorks.previewReminderTitle}</p>
                    <p className="text-xs text-slate-400">{copy.howItWorks.previewReminderMeta}</p>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300/90" aria-hidden />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-white">{copy.howItWorks.previewOutcomeTitle}</p>
                    <p className="text-xs text-slate-400">{copy.howItWorks.previewOutcomeMeta}</p>
                  </div>
                  <StatusPill
                    label={copy.howItWorks.previewOutcomeStatus}
                    tone="success"
                    marker="none"
                    className="px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      <section className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-12">
        <div className="space-y-7">
          <SectionHeader label={copy.trustCheck.label} title={copy.trustCheck.title} lead={copy.trustCheck.lead} />
          <div className="grid gap-7 lg:grid-cols-12 lg:items-start lg:gap-8">
            <ul className="space-y-3 text-base text-slate-200/90 sm:text-lg lg:col-span-5">
              {copy.trustCheck.bullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="glass-panel rounded-2xl border-white/10 bg-gradient-to-br from-white/[0.09] via-white/[0.04] to-slate-900/45 p-4 lg:col-span-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{copy.trustCheck.profilePreviewLabel}</p>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-100">{copy.trustCheck.profilePreviewScore}</span>
              </div>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">@example</p>
                  <span className="text-xs text-slate-300">dreddi.me/u/example</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full bg-white/10 px-2.5 py-1">{copy.trustCheck.profilePreviewConfirmed}</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1">{copy.trustCheck.profilePreviewDisputed}</span>
                </div>
              </div>
              <Link
                href="/u"
                className="mt-4 inline-flex rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
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

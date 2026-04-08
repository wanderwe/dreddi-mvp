import type { Metadata } from "next";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { StaticPageLayout } from "@/components/StaticPageLayout";
import { getLocale } from "@/lib/i18n/getLocale";
import { type Locale } from "@/lib/i18n/locales";
import { getWhyCopy, type WhySectionKind } from "@/lib/whyCopy";
import { WhyProgress } from "./WhyProgress";

export function buildWhyMetadata(locale: Locale): Metadata {
  const copy = getWhyCopy(locale);

  return {
    title: copy.seo.title,
    description: copy.seo.description,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return buildWhyMetadata(locale);
}

const sectionClassNameByKind: Record<WhySectionKind, string> = {
  setup: "max-w-2xl space-y-2 text-lg leading-8 text-slate-200 sm:text-xl",
  list: "max-w-xl space-y-2 border-l border-white/10 pl-4 text-lg leading-8 text-slate-300 sm:text-xl",
  trigger: "max-w-2xl space-y-2 text-2xl font-semibold leading-9 text-white sm:text-3xl sm:leading-10",
  quote:
    "max-w-2xl space-y-3 border-l-2 border-emerald-300/60 pl-5 text-xl italic leading-9 text-emerald-50 sm:text-2xl",
  realization: "max-w-2xl space-y-2 text-2xl font-semibold leading-9 text-slate-50 sm:text-3xl sm:leading-10",
  positioning: "max-w-2xl space-y-2 text-xl leading-8 text-emerald-100 sm:text-2xl",
  outcome: "max-w-2xl space-y-2 text-xl leading-8 text-slate-100 sm:text-2xl",
  closing: "max-w-2xl space-y-2 text-2xl font-semibold leading-9 text-emerald-100 sm:text-3xl sm:leading-10",
};

export function WhyPageContent({ locale }: { locale: Locale }) {
  const copy = getWhyCopy(locale);

  return (
    <StaticPageLayout id="why-top" className="max-w-4xl">
      <WhyProgress title={copy.title} />

      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/80">Dreddi</p>
        <h1 className="max-w-3xl text-4xl font-semibold text-white sm:text-5xl">{copy.title}</h1>
        {copy.subtitle ? <p className="max-w-2xl text-lg text-slate-300 sm:text-xl">{copy.subtitle}</p> : null}
      </header>

      <article className="mt-10 space-y-12">
        {copy.sections.map((section, index) => (
          <section key={`section-${index}`} className={sectionClassNameByKind[section.kind]}>
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={`paragraph-${paragraphIndex}`}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>

      <div className="mt-14 border-t border-white/10 pt-8">
        <LocalizedLink
          href="/"
          className="inline-flex rounded-xl bg-emerald-400 px-6 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/40"
        >
          {copy.cta}
        </LocalizedLink>
      </div>
    </StaticPageLayout>
  );
}

export default async function WhyPage() {
  const locale = await getLocale();
  return <WhyPageContent locale={locale} />;
}

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
  setup: "mx-auto max-w-2xl space-y-2 text-lg leading-8 text-slate-200 sm:text-xl",
  list: "mx-auto max-w-xl space-y-1.5 text-lg leading-8 text-slate-300 sm:text-xl",
  trigger:
    "mx-auto max-w-2xl space-y-2 text-2xl font-semibold leading-9 text-slate-50 sm:text-3xl sm:leading-10",
  quote:
    "mx-auto max-w-2xl space-y-2 border-l border-white/15 pl-5 text-xl leading-9 text-slate-100 sm:text-2xl",
  realization:
    "mx-auto max-w-2xl space-y-2 text-2xl font-semibold leading-9 text-white sm:text-3xl sm:leading-10",
  positioning: "mx-auto max-w-2xl space-y-2 text-xl leading-8 text-emerald-100 sm:text-2xl",
  outcome: "mx-auto max-w-2xl space-y-2 text-xl leading-8 text-slate-100 sm:text-2xl",
  closing:
    "mx-auto max-w-2xl space-y-2 text-2xl font-semibold leading-9 text-emerald-100 sm:text-3xl sm:leading-10",
};

export function WhyPageContent({ locale }: { locale: Locale }) {
  const copy = getWhyCopy(locale);

  return (
    <StaticPageLayout id="why-top" className="max-w-4xl">
      <WhyProgress title={copy.title} />

      <header className="space-y-4 text-center">
        <h1 className="text-4xl font-semibold text-white sm:text-5xl">{copy.title}</h1>
        {copy.subtitle ? <p className="text-lg text-slate-300 sm:text-xl">{copy.subtitle}</p> : null}
      </header>

      <article className="mt-10 space-y-12 text-center">
        {copy.sections.map((section, index) => (
          <section key={`section-${index}`} className={sectionClassNameByKind[section.kind]}>
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={`paragraph-${paragraphIndex}`}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>

      <div className="mt-14 flex justify-center">
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

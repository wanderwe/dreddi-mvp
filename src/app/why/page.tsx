import type { Metadata } from "next";
import { StaticPageLayout } from "@/components/StaticPageLayout";
import { getLocale } from "@/lib/i18n/getLocale";
import { type Locale } from "@/lib/i18n/locales";
import { getWhyCopy } from "@/lib/whyCopy";
import { WhyCta } from "./WhyCta";
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

export function WhyPageContent({ locale }: { locale: Locale }) {
  const copy = getWhyCopy(locale);

  return (
    <StaticPageLayout id="why-top" className="max-w-4xl">
      <WhyProgress title={copy.title} />

      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-white sm:text-5xl">{copy.title}</h1>
        {copy.subtitle ? <p className="text-lg text-slate-300 sm:text-xl">{copy.subtitle}</p> : null}
      </header>

      <article className="mt-8 space-y-10 text-base leading-7 text-slate-200">
        {copy.sections.map((section, index) => {
          const sectionClassName =
            section.kind === "turn"
              ? "space-y-3 text-xl font-semibold leading-8 text-slate-50 sm:text-2xl sm:leading-9"
              : section.kind === "list"
                ? "space-y-1.5 text-slate-300"
                : "space-y-2 text-slate-200";

          return (
            <section key={`section-${index}`} className={sectionClassName}>
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={`paragraph-${paragraphIndex}`}>{paragraph}</p>
              ))}
            </section>
          );
        })}
      </article>

      <div className="mt-10">
        <WhyCta primaryLabel={copy.cta.primary} secondaryLabel={copy.cta.secondary} />
      </div>
    </StaticPageLayout>
  );
}

export default async function WhyPage() {
  const locale = await getLocale();
  return <WhyPageContent locale={locale} />;
}

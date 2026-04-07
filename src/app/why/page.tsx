import type { Metadata } from "next";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { StaticPageLayout } from "@/components/StaticPageLayout";
import { getLocale } from "@/lib/i18n/getLocale";
import { type Locale } from "@/lib/i18n/locales";
import { getWhyCopy } from "@/lib/whyCopy";
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
  const emphasizedLines = new Set([
    "And then… nothing happens",
    "That’s the problem",
    "Dreddi exists to keep them visible",
    "Because reputation is not what people say",
  ]);

  return (
    <StaticPageLayout id="why-top">
      <WhyProgress title={copy.title} />

      <header className="space-y-2">
        <h1 className="text-4xl font-semibold text-white sm:text-5xl">{copy.title}</h1>
        {copy.subtitle ? <p className="text-lg text-slate-300 sm:text-xl">{copy.subtitle}</p> : null}
      </header>

      <article className="mt-6 space-y-6 text-base leading-7 text-slate-200">
        {copy.sections.map((section, index) => (
          <section key={`section-${index}`} className="space-y-2">
            {section.heading ? (
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">{section.heading}</h2>
            ) : null}
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p
                key={`paragraph-${paragraphIndex}`}
                className={emphasizedLines.has(paragraph) ? "font-semibold text-slate-50" : "text-slate-200"}
              >
                {paragraph.split("\n").map((line, lineIndex, lines) => (
                  <span key={`${line}-${lineIndex}`}>
                    {line}
                    {lineIndex < lines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            ))}
          </section>
        ))}
      </article>

      <div className="mt-6">
        <LocalizedLink
          href="/"
          className="inline-flex rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/40"
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

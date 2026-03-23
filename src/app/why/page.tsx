import type { Metadata } from "next";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { StaticPageLayout } from "@/components/StaticPageLayout";
import { getLocale } from "@/lib/i18n/getLocale";
import { getWhyCopy } from "@/lib/whyCopy";
import { WhyProgress } from "./WhyProgress";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = getWhyCopy(locale);

  return {
    title: copy.seo.title,
    description: copy.seo.description,
  };
}

export default async function WhyPage() {
  const locale = await getLocale();
  const copy = getWhyCopy(locale);

  return (
    <StaticPageLayout id="why-top">
      <WhyProgress title={copy.title} />

      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-white sm:text-5xl">{copy.title}</h1>
        <p className="text-lg text-slate-300 sm:text-xl">{copy.subtitle}</p>
      </header>

      <div className="mt-14 space-y-14 text-base leading-relaxed text-slate-200">
        {copy.sections.map((section, index) => (
          <section key={`section-${index}`} className="space-y-4">
            {section.heading ? (
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">{section.heading}</h2>
            ) : null}
            {section.paragraphs.map((paragraph, paragraphIndex) => {
              const isPrinciple =
                paragraph === "Promises should have a record." ||
                paragraph === "Обіцянки мають бути зафіксовані.";
              const isFinalNoteLabel = !section.heading && paragraphIndex === 0;

              return (
                <p
                  key={`paragraph-${paragraphIndex}`}
                  className={
                    isPrinciple
                      ? "font-semibold text-white"
                      : isFinalNoteLabel
                        ? "text-sm font-semibold uppercase tracking-[0.12em] text-slate-300"
                        : undefined
                  }
                >
                  {paragraph.split("\n").map((line, lineIndex, lines) => (
                    <span key={`${line}-${lineIndex}`}>
                      {line}
                      {lineIndex < lines.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </p>
              );
            })}
          </section>
        ))}
      </div>

      <div className="mt-14">
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

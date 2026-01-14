import { LegalDocumentContent } from "@/app/components/LegalDocumentContent";
import { AppHeader } from "@/app/components/nav/AppHeader";
import { BackButton } from "@/app/components/nav/BackButton";
import { getLocale } from "@/lib/i18n/getLocale";
import { getMessages } from "@/lib/i18n/getMessages";
import { createTranslator } from "@/lib/i18n/t";
import { getLegalDocument, type LegalDocumentType } from "@/lib/legalDocuments";

const formatDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));

export async function LegalDocumentPage({ type }: { type: LegalDocumentType }) {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const t = createTranslator(locale, messages);
  const { document, error } = await getLegalDocument(type, locale);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(82,193,106,0.2),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_60%_70%,rgba(34,55,93,0.22),transparent_45%)]"
        aria-hidden
      />

      <AppHeader navItems={[]} showAuthCta />

      <main className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <div>
          <BackButton fallbackHref="/" />
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/40 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          {document ? (
            <>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                {t("legal.sectionEyebrow")}
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                {document.title}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                {t("legal.lastUpdated", { date: formatDate(document.updated_at, locale) })}
              </p>
              <div className="mt-8">
                <LegalDocumentContent content={document.content} />
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                {t("legal.unavailableTitle")}
              </h1>
              <p className="mt-4 text-sm text-slate-300">
                {t("legal.unavailableBody")}
              </p>
              {error ? (
                <p className="mt-2 text-xs text-red-300">{error}</p>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

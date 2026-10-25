import { LegalDocumentContent } from "@/app/components/LegalDocumentContent";
import { getLocale } from "@/lib/i18n/getLocale";
import { type Locale } from "@/lib/i18n/locales";
import { getMessages } from "@/lib/i18n/getMessages";
import { createTranslator } from "@/lib/i18n/t";
import { getLegalDocument, type LegalDocumentType } from "@/lib/legalDocuments";

const formatDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));

export async function LegalDocumentPage({
  type,
  locale: localeOverride,
}: {
  type: LegalDocumentType;
  locale?: Locale;
}) {
  const locale = localeOverride ?? (await getLocale());
  const messages = await getMessages(locale);
  const t = createTranslator(locale, messages);
  const { document, error } = await getLegalDocument(type, locale);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-tone-950 via-[var(--page-wash-via)] to-[var(--page-wash-to)] text-tone-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,var(--page-wash-1),transparent_30%),radial-gradient(circle_at_70%_10%,var(--page-wash-2),transparent_28%),radial-gradient(circle_at_60%_70%,var(--page-wash-3),transparent_45%)]"
        aria-hidden
      />

      <main className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <div className="rounded-3xl border border-tone-white/10 bg-tone-black/40 p-8 shadow-2xl shadow-tone-black/40 backdrop-blur">
          {document ? (
            <>
              <p className="text-xs uppercase tracking-[0.3em] text-accent-200">
                {t("legal.sectionEyebrow")}
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-tone-white sm:text-4xl">
                {document.title}
              </h1>
              <p className="mt-2 text-sm text-tone-400">
                {t("legal.lastUpdated", { date: formatDate(document.updated_at, locale) })}
              </p>
              <div className="mt-8">
                <LegalDocumentContent content={document.content} />
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-semibold text-tone-white sm:text-4xl">
                {t("legal.unavailableTitle")}
              </h1>
              <p className="mt-4 text-sm text-tone-300">
                {t("legal.unavailableBody")}
              </p>
              {error ? (
                <p className="mt-2 text-xs text-danger-300">{error}</p>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

import { LegalDocumentPage } from "@/app/components/LegalDocumentPage";
import { resolveRouteLocale } from "@/lib/i18n/resolveRouteLocale";

export const dynamic = "force-dynamic";

export default async function LocalizedPrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveRouteLocale((await params).locale);
  return <LegalDocumentPage type="privacy" locale={locale} />;
}

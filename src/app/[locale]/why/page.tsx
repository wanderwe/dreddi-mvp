import type { Metadata } from "next";
import { buildWhyMetadata, WhyPageContent } from "@/app/why/page";
import { resolveRouteLocale } from "@/lib/i18n/resolveRouteLocale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveRouteLocale((await params).locale);
  return buildWhyMetadata(locale);
}

export default async function LocalizedWhyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveRouteLocale((await params).locale);
  return <WhyPageContent locale={locale} />;
}

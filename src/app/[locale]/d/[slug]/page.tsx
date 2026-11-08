import type { Metadata } from "next";
import { resolveRouteLocale } from "@/lib/i18n/resolveRouteLocale";
import { QuickCardPage, buildQuickCardMetadata } from "@/app/d/[slug]/card";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  return buildQuickCardMetadata(slug, resolveRouteLocale(locale));
}

export default async function Page({ params }: Params) {
  const { locale, slug } = await params;
  return <QuickCardPage slug={slug} locale={resolveRouteLocale(locale)} />;
}

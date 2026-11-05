import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildAgreementMetadata } from "@/app/p/agreements/[id]/layout";
import { resolveRouteLocale } from "@/lib/i18n/resolveRouteLocale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, id } = await params;
  return buildAgreementMetadata(id, resolveRouteLocale(localeParam));
}

export default function LocalizedAgreementLayout({ children }: { children: ReactNode }) {
  return children;
}

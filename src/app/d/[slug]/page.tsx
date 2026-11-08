import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/getLocale";
import { QuickCardPage, buildQuickCardMetadata } from "./card";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return buildQuickCardMetadata((await params).slug, await getLocale());
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <QuickCardPage slug={(await params).slug} locale={await getLocale()} />;
}

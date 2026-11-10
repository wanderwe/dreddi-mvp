import type { Metadata } from "next";
import { resolveRouteLocale } from "@/lib/i18n/resolveRouteLocale";
import { buildChatMetadata } from "@/app/decide/c/[token]/meta";

export { default } from "@/app/decide/c/[token]/ChatDisputePage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ locale: string; token: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, token } = await params;
  return buildChatMetadata(token, resolveRouteLocale(locale));
}

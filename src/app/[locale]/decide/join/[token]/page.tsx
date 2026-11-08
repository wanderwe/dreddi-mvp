import type { Metadata } from "next";
import { resolveRouteLocale } from "@/lib/i18n/resolveRouteLocale";
import { buildInviteMetadata } from "@/app/decide/join/[token]/invite";

export { default } from "@/app/decide/join/[token]/page";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ locale: string; token: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, token } = await params;
  return buildInviteMetadata(token, resolveRouteLocale(locale));
}

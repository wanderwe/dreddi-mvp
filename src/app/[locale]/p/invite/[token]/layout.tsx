import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildInviteMetadata } from "@/app/p/invite/[token]/layout";
import { resolveRouteLocale } from "@/lib/i18n/resolveRouteLocale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, token } = await params;
  const locale = resolveRouteLocale(localeParam);
  return buildInviteMetadata(token, locale);
}

export default function LocalizedInviteLayout({ children }: { children: ReactNode }) {
  return children;
}

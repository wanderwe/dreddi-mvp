import type { ReactNode } from "react";
import { notFound } from "next/navigation";

const SUPPORTED_LOCALES = ["en", "uk"] as const;

type LocaleParam = {
  children: ReactNode;
  params: { locale: string };
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default function LocaleLayout({ children, params }: LocaleParam) {
  if (!SUPPORTED_LOCALES.includes(params.locale as (typeof SUPPORTED_LOCALES)[number])) {
    notFound();
  }

  return children;
}

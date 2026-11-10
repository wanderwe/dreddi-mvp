import type { Metadata } from "next";
import { localizePath } from "@/lib/i18n/routing";
import { resolveRouteLocale } from "@/lib/i18n/resolveRouteLocale";

export { default } from "@/app/page";

// The homepage alone is canonical to itself, in both languages. Other pages set their own or none.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = resolveRouteLocale((await params).locale);
  return {
    alternates: {
      canonical: localizePath("/", locale),
      languages: { en: localizePath("/", "en"), uk: localizePath("/", "uk") },
    },
  };
}

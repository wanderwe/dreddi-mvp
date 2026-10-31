"use client";

import { usePathname } from "next/navigation";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { useT } from "@/lib/i18n/I18nProvider";
import { extractLocaleFromPathname } from "@/lib/i18n/routing";

// Deals, groups and watching are one section: these tabs replace their separate header icons.
// Underlined page tabs, so they read as navigation and not as the filter chips further down.
const TABS = [
  { href: "/promises", labelKey: "dealsTabs.mine" },
  { href: "/promises/groups", labelKey: "nav.groups" },
  { href: "/watching", labelKey: "nav.watching" },
] as const;

const isActive = (path: string, href: string) =>
  href === "/promises"
    ? path === "/promises"
    : path === href || path.startsWith(`${href}/`);

export function DealsTabs({ className = "" }: { className?: string }) {
  const t = useT();
  const { pathnameWithoutLocale } = extractLocaleFromPathname(usePathname() || "/");

  return (
    <nav
      aria-label={t("dealsTabs.label")}
      className={`flex gap-6 overflow-x-auto border-b border-tone-white/10 ${className}`}
    >
      {TABS.map((tab) => {
        const active = isActive(pathnameWithoutLocale, tab.href);
        return (
          <LocalizedLink
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-1 pb-3 pt-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/40 ${
              active
                ? "border-accent-300 text-tone-white"
                : "border-transparent text-tone-400 hover:border-tone-white/20 hover:text-tone-100"
            }`}
          >
            {t(tab.labelKey)}
          </LocalizedLink>
        );
      })}
    </nav>
  );
}

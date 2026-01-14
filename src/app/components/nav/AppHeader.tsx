"use client";

import Link from "next/link";
import { DreddiLogo } from "@/app/components/DreddiLogo";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { NotificationBell } from "@/app/components/NotificationBell";
import { MobileMenu } from "@/app/components/MobileMenu";
import { UserMenu } from "@/app/components/nav/UserMenu";
import { useT } from "@/lib/i18n/I18nProvider";

type NavItem = {
  href: string;
  label: string;
  emphasis?: boolean;
};

type AppHeaderProps = {
  isAuthenticated?: boolean;
  onLogout?: () => void;
  navItems?: NavItem[];
  showAuthCta?: boolean;
  className?: string;
  variant?: "solid" | "transparent";
};

export function AppHeader({
  isAuthenticated = false,
  onLogout,
  navItems = [],
  showAuthCta = true,
  className = "",
  variant = "solid",
}: AppHeaderProps) {
  const t = useT();
  const baseLinkClasses =
    "rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100";
  const emphasisClasses =
    "rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/45";

  return (
    <header
      className={`w-full ${
        variant === "solid" ? "border-b border-white/10 bg-black/30/50 backdrop-blur" : "bg-transparent"
      } ${className}`}
    >
      <div className="relative mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-4 px-6 py-4 md:flex-wrap">
        <Link href="/" className="flex min-w-0 items-center text-white">
          <DreddiLogo
            accentClassName="text-xs"
            markClassName="h-11 w-11"
            titleClassName="text-lg"
          />
        </Link>

        {navItems.length > 0 && (
          <nav className="hidden flex-1 items-center justify-center gap-3 text-sm font-medium text-slate-200 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={item.emphasis ? emphasisClasses : baseLinkClasses}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="hidden items-center gap-3 md:flex">
          <LocaleSwitcher />
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <UserMenu onLogout={onLogout} />
            </>
          ) : (
            showAuthCta && (
              <Link href="/login" className={baseLinkClasses}>
                {t("nav.login")}
              </Link>
            )
          )}
        </div>

        <MobileMenu
          isAuthenticated={isAuthenticated}
          onLogout={onLogout}
          navItems={navItems}
          showAuthCta={showAuthCta}
        />
      </div>
    </header>
  );
}

export default AppHeader;
export type { NavItem };

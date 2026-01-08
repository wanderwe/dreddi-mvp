"use client";

import Link from "next/link";
import { useState } from "react";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { useT } from "@/lib/i18n/I18nProvider";

type HeaderActionsProps = {
  isAuthenticated?: boolean;
  onLogout?: () => void;
  className?: string;
};

export function HeaderActions({ isAuthenticated = false, onLogout, className = "" }: HeaderActionsProps) {
  const t = useT();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <nav className="hidden flex-nowrap items-center gap-3 text-sm font-medium text-slate-200 md:flex">
        {isAuthenticated ? (
          <>
            <Link
              className="whitespace-nowrap rounded-xl border border-transparent px-3 py-1.5 transition hover:border-emerald-300/40 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              href="/promises"
            >
              {t("nav.myPromises")}
            </Link>
            <Link
              className="whitespace-nowrap rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              href="/promises/new"
            >
              {t("nav.newPromise")}
            </Link>
          </>
        ) : (
          <Link
            className="whitespace-nowrap rounded-xl border border-transparent px-3 py-1.5 transition hover:border-emerald-300/40 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            href="/login"
          >
            {t("nav.login")}
          </Link>
        )}
        <div className="shrink-0">
          <LocaleSwitcher />
        </div>
        {isAuthenticated && onLogout && (
          <button
            onClick={onLogout}
            className="whitespace-nowrap rounded-xl px-3 py-1.5 text-slate-300 transition hover:bg-white/10 hover:text-emerald-200 active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
            type="button"
          >
            {t("nav.logout")}
          </button>
        )}
      </nav>

      <div className="flex items-center md:hidden">
        <button
          type="button"
          onClick={handleMenuToggle}
          aria-expanded={isMenuOpen}
          aria-label="Menu"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {isMenuOpen && (
        <div className="absolute right-0 top-full z-20 mt-3 w-56 rounded-2xl border border-white/10 bg-slate-950/95 p-3 text-sm text-slate-200 shadow-xl shadow-black/40 backdrop-blur md:hidden">
          <div className="flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  className="rounded-xl px-3 py-2 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
                  href="/promises"
                  onClick={handleCloseMenu}
                >
                  {t("nav.myPromises")}
                </Link>
                <Link
                  className="rounded-xl bg-emerald-400 px-3 py-2 font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
                  href="/promises/new"
                  onClick={handleCloseMenu}
                >
                  {t("nav.newPromise")}
                </Link>
              </>
            ) : (
              <Link
                className="rounded-xl px-3 py-2 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
                href="/login"
                onClick={handleCloseMenu}
              >
                {t("nav.login")}
              </Link>
            )}
            <div className="rounded-xl bg-white/5 px-3 py-2">
              <LocaleSwitcher />
            </div>
            {isAuthenticated && onLogout && (
              <button
                onClick={() => {
                  handleCloseMenu();
                  onLogout();
                }}
                className="rounded-xl px-3 py-2 text-left text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
                type="button"
              >
                {t("nav.logout")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default HeaderActions;

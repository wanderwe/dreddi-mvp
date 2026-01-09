"use client";

import Link from "next/link";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { useT } from "@/lib/i18n/I18nProvider";

type HeaderActionsProps = {
  isAuthenticated?: boolean;
  onLogout?: () => void;
  className?: string;
};

export function HeaderActions({ isAuthenticated = false, onLogout, className = "" }: HeaderActionsProps) {
  const t = useT();

  return (
    <nav
      className={`flex flex-nowrap items-center gap-3 text-sm font-medium text-slate-200 ${className}`}
    >
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
        <>
          <Link
            className="whitespace-nowrap rounded-xl border border-transparent px-3 py-1.5 transition hover:border-emerald-300/40 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            href="/login"
          >
            {t("nav.login")}
          </Link>
        </>
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
  );
}

export default HeaderActions;

"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/I18nProvider";

export function AppFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-slate-950/60 text-slate-400">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs sm:flex-row">
        <span>© {year} Dreddi knows</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="transition hover:text-emerald-200">
            {t("nav.privacy")}
          </Link>
          <Link href="/terms" className="transition hover:text-emerald-200">
            {t("nav.terms")}
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default AppFooter;

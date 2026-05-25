"use client";

import { LocalizedLink } from "@/app/components/LocalizedLink";
import { FeedbackModalTrigger } from "@/app/components/FeedbackModal";
import { getAuthState } from "@/lib/auth/getAuthState";
import { extractLocaleFromPathname } from "@/lib/i18n/routing";
import { useT } from "@/lib/i18n/I18nProvider";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function AppFooter() {
  const t = useT();
  const pathname = usePathname();
  const pathWithoutLocale = extractLocaleFromPathname(pathname || "/").pathnameWithoutLocale;
  const isEmbedPath = /^\/u\/[^/]+\/embed\/?$/.test(pathWithoutLocale) || /^\/embed\/agreement\/[^/]+\/?$/.test(pathWithoutLocale);
  const [canSendFeedback, setCanSendFeedback] = useState(false);
  const year = new Date().getFullYear();
  const commitSha = process.env.NEXT_PUBLIC_COMMIT_SHA;
  const shortSha = commitSha ? commitSha.slice(0, 7) : null;

  useEffect(() => {
    let active = true;

    const loadAuth = async () => {
      const auth = await getAuthState();
      if (!active) return;
      setCanSendFeedback(auth.isLoggedIn);
    };

    void loadAuth();
    return () => {
      active = false;
    };
  }, []);

  if (isEmbedPath) return null;

  return (
    <footer className="border-t border-white/5 bg-slate-950/60 text-slate-400">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs sm:flex-row sm:gap-3">
        <span>© {year} Dreddi knows</span>
        <div className="flex w-full flex-col items-center gap-1 text-center sm:w-auto sm:flex-row sm:gap-4 sm:text-left">
          {canSendFeedback && (
            <FeedbackModalTrigger
              triggerClassName="cursor-pointer text-slate-400 transition hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-300/40 rounded-sm"
            />
          )}
          <LocalizedLink href="/privacy" className="transition hover:text-emerald-200">
            {t("nav.privacy")}
          </LocalizedLink>
          <LocalizedLink href="/terms" className="transition hover:text-emerald-200">
            {t("nav.terms")}
          </LocalizedLink>
          {shortSha && (
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
              build {shortSha}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}

export default AppFooter;

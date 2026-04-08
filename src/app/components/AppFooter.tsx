"use client";

import { LocalizedLink } from "@/app/components/LocalizedLink";
import { FeedbackModalTrigger } from "@/app/components/FeedbackModal";
import { getAuthState } from "@/lib/auth/getAuthState";
import { useT } from "@/lib/i18n/I18nProvider";
import { useEffect, useState } from "react";

export function AppFooter() {
  const t = useT();
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

  return (
    <footer className="border-t border-white/5 bg-slate-950/60 text-slate-400">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs sm:flex-row">
        <span>© {year} Dreddi knows</span>
        <div className="flex items-center gap-4">
          {canSendFeedback && (
            <FeedbackModalTrigger
              triggerClassName="cursor-pointer rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-emerald-300/40 hover:text-emerald-100"
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { getAuthState } from "@/lib/auth/getAuthState";
import { useLocale } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";

type WhyCtaProps = {
  primaryLabel: string;
  secondaryLabel: string;
};

export function WhyCta({ primaryLabel, secondaryLabel }: WhyCtaProps) {
  const locale = useLocale();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadAuthState = async () => {
      try {
        const authState = await getAuthState();
        if (isActive) {
          setIsAuthenticated(authState.isLoggedIn);
        }
      } catch {
        if (isActive) {
          setIsAuthenticated(false);
        }
      }
    };

    void loadAuthState();

    return () => {
      isActive = false;
    };
  }, []);

  const href = useMemo(() => {
    const createDealPath = localizePath("/promises/new", locale);
    if (isAuthenticated) {
      return createDealPath;
    }

    return localizeLoginPath(createDealPath, locale);
  }, [isAuthenticated, locale]);

  const publicAgreementsHref = useMemo(() => localizePath("/promises", locale), [locale]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <LocalizedLink
        href={href}
        className="inline-flex rounded-xl bg-emerald-400 px-6 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/40"
      >
        {primaryLabel}
      </LocalizedLink>
      <LocalizedLink
        href={publicAgreementsHref}
        className="inline-flex rounded-xl border border-white/15 px-6 py-3.5 text-base font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
      >
        {secondaryLabel}
      </LocalizedLink>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { getAuthState } from "@/lib/auth/getAuthState";
import { useLocale } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";

type WhyCtaProps = {
  label: string;
};

export function WhyCta({ label }: WhyCtaProps) {
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

  return (
    <LocalizedLink
      href={href}
      className="inline-flex rounded-xl bg-emerald-400 px-6 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/40"
    >
      {label}
    </LocalizedLink>
  );
}

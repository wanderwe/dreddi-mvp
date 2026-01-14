"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DreddiLogo } from "@/app/components/DreddiLogo";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { MobileMenu } from "@/app/components/MobileMenu";
import { NewDealButton } from "@/app/components/NewDealButton";
import { NotificationBell } from "@/app/components/NotificationBell";
import { ProfileSettingsMenu } from "@/app/components/ProfileSettingsMenu";
import { useT } from "@/lib/i18n/I18nProvider";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";

export function AppHeader() {
  const t = useT();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const isAuthenticated = Boolean(email);
  const showBackLink = !isAuthenticated && pathname !== "/";
  const linkBaseClasses =
    "whitespace-nowrap rounded-xl border border-transparent px-3 py-1.5 transition hover:border-emerald-300/40 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

  useEffect(() => {
    let active = true;
    const client = supabase;

    if (!client) return;

    const syncSession = async () => {
      const { data: sessionData } = await client.auth.getSession();
      if (!active) return;
      setEmail(sessionData.session?.user?.email ?? null);
    };

    void syncSession();

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="relative border-b border-white/10 bg-black/30/50 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-4 px-6 py-4 md:flex-wrap">
        <Link href="/" className="flex min-w-0 items-center text-white">
          <DreddiLogo
            accentClassName="text-xs"
            markClassName="h-11 w-11"
            titleClassName="text-lg"
          />
        </Link>

        <div className="flex items-center gap-3">
          {showBackLink && (
            <Link href="/" className="text-sm font-medium text-emerald-200 hover:text-emerald-100">
              ← {t("auth.login.back")}
            </Link>
          )}
          {isAuthenticated ? (
            <>
              <nav className="hidden items-center gap-3 text-sm font-medium text-slate-200 md:flex">
                <Link className={linkBaseClasses} href="/promises">
                  {t("nav.myPromises")}
                </Link>
                <NewDealButton label={t("nav.newPromise")} />
                <NotificationBell />
                <ProfileSettingsMenu />
                <LocaleSwitcher />
              </nav>
              <div className="flex items-center gap-2 md:hidden">
                <LocaleSwitcher />
                <MobileMenu isAuthenticated={isAuthenticated} />
              </div>
            </>
          ) : (
            <LocaleSwitcher />
          )}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;

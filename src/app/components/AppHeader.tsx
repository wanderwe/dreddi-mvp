"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { DreddiLogo } from "@/app/components/DreddiLogo";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { MobileMenu } from "@/app/components/MobileMenu";
import { NewDealButton } from "@/app/components/NewDealButton";
import { NotificationBell } from "@/app/components/NotificationBell";
import { ProfileSettingsMenu } from "@/app/components/ProfileSettingsMenu";
import { IconButton } from "@/app/components/ui/IconButton";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { useT } from "@/lib/i18n/I18nProvider";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import {
  buildAuthState,
  getAuthState,
  isMockAuthEnabled,
  type AuthState,
} from "@/lib/auth/getAuthState";

export function AppHeader() {
  const t = useT();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>(() => buildAuthState(null));
  const isAuthenticated = authState.isLoggedIn;
  const showBackLink = !isAuthenticated && pathname !== "/";
  const showSignIn = !isAuthenticated && pathname !== "/login";
  const linkBaseClasses =
    "cursor-pointer whitespace-nowrap rounded-xl border border-transparent px-3 py-1.5 transition hover:border-emerald-300/40 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

  useEffect(() => {
    let active = true;
    const client = supabase;

    const syncSession = async () => {
      const nextState = await getAuthState();
      if (!active) return;
      setAuthState(nextState);
    };

    void syncSession();

    if (isMockAuthEnabled() || !client) {
      return () => {
        active = false;
      };
    }

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const user = session?.user
        ? { id: session.user.id, email: session.user.email ?? null }
        : null;
      setAuthState(buildAuthState(user));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="relative border-b border-white/10 bg-black/30/50 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-4 px-6 py-4 md:flex-wrap">
        <Link href="/" className="flex min-w-0 cursor-pointer items-center text-white">
          <DreddiLogo
            accentClassName="text-xs"
            markClassName="h-11 w-11"
            titleClassName="text-lg"
          />
        </Link>

        <div className="flex items-center gap-3">
          {authState.isMock && (
            <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200">
              Mock auth
            </span>
          )}
          {showBackLink && (
            <Link
              href="/"
              className="cursor-pointer text-sm font-medium text-emerald-200 hover:text-emerald-100"
            >
              ← {t("auth.login.back")}
            </Link>
          )}
          {isAuthenticated ? (
            <>
              <nav className="hidden w-full flex-nowrap items-center text-sm font-medium text-slate-200 md:flex">
                <div className="flex items-center gap-3 pr-4">
                  <Link className={linkBaseClasses} href="/promises">
                    {t("nav.myPromises")}
                  </Link>
                  <Tooltip label={t("nav.newPromise")} placement="top">
                    <NewDealButton label={t("nav.newPromise")} variant="icon" />
                  </Tooltip>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <Tooltip label={t("nav.publicProfiles")} placement="top">
                    <IconButton
                      href="/u"
                      ariaLabel={t("nav.publicProfiles")}
                      icon={<UsersRound className="h-4 w-4" aria-hidden />}
                    />
                  </Tooltip>
                  <Tooltip label={t("nav.notifications")} placement="top">
                    <NotificationBell />
                  </Tooltip>
                  <LocaleSwitcher />
                  <ProfileSettingsMenu />
                </div>
              </nav>
              <div className="flex items-center gap-2 md:hidden">
                <LocaleSwitcher />
                <MobileMenu isAuthenticated={isAuthenticated} />
              </div>
            </>
          ) : (
            <>
              <nav className="hidden items-center gap-3 text-sm font-medium text-slate-200 md:flex">
                {showSignIn && (
                  <Link
                    href="/login"
                    className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    {t("auth.login.signInCta")}
                  </Link>
                )}
                <LocaleSwitcher />
              </nav>
              <div className="flex items-center gap-2 md:hidden">
                <LocaleSwitcher />
                <MobileMenu isAuthenticated={isAuthenticated} />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;

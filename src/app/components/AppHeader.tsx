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
import { isAwaitingYourAction } from "@/lib/promiseActions";
import { getPromiseInviteStatus } from "@/lib/promiseAcceptance";
import { resolveExecutorId } from "@/lib/promiseParticipants";
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
  const [actionQueueCount, setActionQueueCount] = useState(0);
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

  useEffect(() => {
    const client = supabase;
    if (!authState.isLoggedIn || !authState.user || !client) {
      setActionQueueCount(0);
      return;
    }

    let active = true;

    const loadCachedCount = () => {
      const cached = window.localStorage.getItem("dreddi_awaiting_action_count");
      if (!cached) return;
      const parsed = Number(cached);
      if (!Number.isNaN(parsed)) setActionQueueCount(parsed);
    };

    const syncCount = async () => {
      const userId = authState.user.id;
      const { data, error } = await client
        .from("promises")
        .select(
          "status,counterparty_accepted_at,invite_status,invited_at,accepted_at,declined_at,ignored_at,creator_id,promisor_id,promisee_id,counterparty_id"
        )
        .or(`promisor_id.eq.${userId},promisee_id.eq.${userId},creator_id.eq.${userId},counterparty_id.eq.${userId}`);

      if (!active || error) return;

      const count = (data ?? []).filter((row) => {
        const executorId = resolveExecutorId(row);
        const role = executorId && executorId === userId ? "promisor" : "counterparty";
        const isReviewer = executorId !== userId;
        const inviteStatus = getPromiseInviteStatus(row);

        return isAwaitingYourAction({
          status: row.status,
          role,
          inviteStatus,
          isReviewer,
        });
      }).length;

      setActionQueueCount(count);
      window.localStorage.setItem("dreddi_awaiting_action_count", String(count));
    };

    const onAwaitingActionsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ count?: number }>;
      const count = customEvent.detail?.count;
      if (typeof count === "number") setActionQueueCount(count);
    };

    loadCachedCount();
    void syncCount();
    window.addEventListener(
      "dreddi:awaiting-actions-updated",
      onAwaitingActionsUpdated as EventListener
    );

    return () => {
      active = false;
      window.removeEventListener(
        "dreddi:awaiting-actions-updated",
        onAwaitingActionsUpdated as EventListener
      );
    };
  }, [authState.isLoggedIn, authState.user]);

  return (
    <header className="relative border-b border-white/10 bg-black/30/50 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-4 px-6 py-4 md:flex-wrap">
        <Link href="/" className="flex min-w-0 cursor-pointer items-center gap-2 text-white">
          <DreddiLogo
            accentClassName="text-xs"
            markClassName="h-11 w-11"
            titleClassName="text-lg"
          />
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold lowercase tracking-wide text-slate-200/70">
            beta
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {authState.isMock && (
            <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200">
              MOCK AUTH
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
                  <Link
                    href="/promises?filter=awaiting_my_action"
                    className={[
                      "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition",
                      actionQueueCount > 0
                        ? "border-amber-200/40 bg-amber-300/20 text-amber-100"
                        : "border-white/15 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10",
                    ].join(" ")}
                  >
                    {t("nav.actionQueueBadge")}
                    {actionQueueCount > 0 && (
                      <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[11px] text-slate-900">{actionQueueCount}</span>
                    )}
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
                <MobileMenu isAuthenticated={isAuthenticated} actionQueueCount={actionQueueCount} />
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
                <MobileMenu isAuthenticated={isAuthenticated} actionQueueCount={actionQueueCount} />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;

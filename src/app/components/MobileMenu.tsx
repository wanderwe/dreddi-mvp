"use client";

import { LocalizedLink } from "@/app/components/LocalizedLink";
import { useState, useEffect } from "react";
import { ProfileSettingsPanel } from "@/app/components/ProfileSettingsMenu";
import { NOTIFICATION_COUNT_SYNC_EVENT } from "@/lib/notifications/clientSync";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetOverlay,
  SheetPortal,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { useT } from "@/lib/i18n/I18nProvider";

type MobileMenuProps = {
  isAuthenticated?: boolean;
  actionQueueCount?: number;
  actionQueueHref?: string;
};

export function MobileMenu({
  isAuthenticated = false,
  actionQueueCount = 0,
  actionQueueHref = "/promises?filter=awaiting_my_action",
}: MobileMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      if (e instanceof CustomEvent) setNotificationCount((e.detail as { count: number }).count ?? 0);
    };
    window.addEventListener(NOTIFICATION_COUNT_SYNC_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATION_COUNT_SYNC_EVENT, handler);
  }, []);
  const baseLinkClasses =
    "rounded-xl border border-white/10 px-3 py-2 text-left text-white transition hover:border-emerald-300/50 hover:text-emerald-100";
  const primaryLinkClasses =
    "rounded-xl bg-emerald-400 px-3 py-2 text-left font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/45";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Open menu"
          className="flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white shadow-sm shadow-black/20 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:hidden"
        >
          <span className="flex h-5 w-5 flex-col items-center justify-center gap-1">
            <span className="h-0.5 w-5 rounded-full bg-white" />
            <span className="h-0.5 w-5 rounded-full bg-white" />
            <span className="h-0.5 w-5 rounded-full bg-white" />
          </span>
        </button>
      </SheetTrigger>
      <SheetPortal>
        <SheetOverlay />
        <SheetContent id="mobile-menu" className="w-[calc(100vw-1rem)] max-w-sm p-4 md:hidden">
          <nav className="flex flex-col gap-4 text-sm font-medium text-slate-200">
            {isAuthenticated ? (
              <>
                <SheetClose asChild>
                  <LocalizedLink className={baseLinkClasses} href="/promises">
                    {t("nav.myPromises")}
                  </LocalizedLink>
                </SheetClose>
                <SheetClose asChild>
                  <LocalizedLink className={baseLinkClasses} href="/promises/groups">
                    {t("nav.groups")}
                  </LocalizedLink>
                </SheetClose>
                <SheetClose asChild>
                  <LocalizedLink className={baseLinkClasses} href="/watching">
                    {t("nav.watching")}
                  </LocalizedLink>
                </SheetClose>
                {actionQueueCount > 0 && (
                  <SheetClose asChild>
                    <LocalizedLink
                      className="flex items-center justify-between rounded-xl border border-amber-300/40 bg-amber-300/15 px-3 py-2 text-left text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-300/22"
                      href={actionQueueHref}
                    >
                      <span>{t("nav.actionQueueBadge")}</span>
                      <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">
                        {actionQueueCount}
                      </span>
                    </LocalizedLink>
                  </SheetClose>
                )}
                <SheetClose asChild>
                  <LocalizedLink className={primaryLinkClasses} href="/promises/new">
                    {t("nav.newPromise")}
                  </LocalizedLink>
                </SheetClose>
                <SheetClose asChild>
                  <LocalizedLink className={baseLinkClasses} href="/u">
                    {t("nav.publicProfiles")}
                  </LocalizedLink>
                </SheetClose>
                <SheetClose asChild>
                  <LocalizedLink className={`${baseLinkClasses} flex items-center justify-between`} href="/notifications">
                    <span>{t("nav.notifications")}</span>
                    {notificationCount > 0 && (
                      <span className="rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">
                        {notificationCount}
                      </span>
                    )}
                  </LocalizedLink>
                </SheetClose>
                <div className="mt-2 border-t border-white/10 pt-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                    {t("profileSettings.sectionLabel")}
                  </div>
                  <ProfileSettingsPanel showTitle={false} className="mt-3" />
                </div>
              </>
            ) : (
              <SheetClose asChild>
                <LocalizedLink className={primaryLinkClasses} href="/login">
                  {t("auth.login.signInCta")}
                </LocalizedLink>
              </SheetClose>
            )}
          </nav>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}

export default MobileMenu;

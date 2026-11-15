"use client";

import { X } from "lucide-react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { useState, useEffect } from "react";
import { ProfileSettingsPanel } from "@/app/components/ProfileSettingsMenu";
import { ThemeSegment } from "@/app/components/ThemeSwitcher";
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
    "rounded-xl border border-tone-white/10 px-3 py-2 text-left text-tone-white transition hover:border-accent-300/50 hover:text-accent-100";
  // «Нова обіцянка» and «Нова суперечка» stand out the same, gently: neither is the one main action.
  const createLinkClasses =
    "rounded-xl border border-accent-300/40 px-3 py-2 text-left text-accent-200 transition hover:border-accent-300/70 hover:bg-accent-400/10";

  // Signed out there is nothing to list but «Увійти»: the header shows that button instead.
  if (!isAuthenticated) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Open menu"
          className="flex cursor-pointer items-center justify-center rounded-xl border border-tone-white/10 bg-tone-white/5 p-2 text-tone-white shadow-sm shadow-tone-black/20 transition hover:bg-tone-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-tone-950 md:hidden"
        >
          <span className="flex h-5 w-5 flex-col items-center justify-center gap-1">
            <span className="h-0.5 w-5 rounded-full bg-tone-white" />
            <span className="h-0.5 w-5 rounded-full bg-tone-white" />
            <span className="h-0.5 w-5 rounded-full bg-tone-white" />
          </span>
        </button>
      </SheetTrigger>
      <SheetPortal>
        <SheetOverlay />
        {/* Narrower than the screen, so the dimmed page on the left is wide enough to tap and close. */}
        <SheetContent id="mobile-menu" className="w-[85vw] max-w-sm p-4 md:hidden">
          <div className="mb-3 flex justify-end">
            <SheetClose asChild>
              <button
                type="button"
                aria-label={t("nav.closeMenu")}
                className="flex cursor-pointer items-center justify-center rounded-xl border border-tone-white/10 p-2 text-tone-200 transition hover:bg-tone-white/10"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </SheetClose>
          </div>
          <nav className="flex flex-col gap-4 text-sm font-medium text-tone-200">
                <SheetClose asChild>
                  <LocalizedLink className={baseLinkClasses} href="/promises">
                    {t("nav.myPromises")}
                  </LocalizedLink>
                </SheetClose>
                {actionQueueCount > 0 && (
                  <SheetClose asChild>
                    <LocalizedLink
                      className={`${baseLinkClasses} flex items-center justify-between`}
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
                  <LocalizedLink className={baseLinkClasses} href="/decide">
                    {t("nav.disputes")}
                  </LocalizedLink>
                </SheetClose>
                <SheetClose asChild>
                  <LocalizedLink className={createLinkClasses} href="/promises/new">
                    {t("nav.newPromise")}
                  </LocalizedLink>
                </SheetClose>
                <SheetClose asChild>
                  <LocalizedLink className={createLinkClasses} href="/decide/new">
                    {t("nav.createMenu.dispute")}
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
                <div className="mt-2 border-t border-tone-white/10 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs uppercase tracking-[0.3em] text-accent-200">
                      {t("profileSettings.sectionLabel")}
                    </div>
                    <ThemeSegment />
                  </div>
                  <ProfileSettingsPanel showTitle={false} className="mt-3" />
                </div>
          </nav>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}

export default MobileMenu;

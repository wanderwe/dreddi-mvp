"use client";

import Link from "next/link";
import { useState } from "react";
import { ProfileSettingsPanel } from "@/app/components/ProfileSettingsMenu";
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
};

export function MobileMenu({ isAuthenticated = false, actionQueueCount = 0 }: MobileMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
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
        <SheetContent id="mobile-menu" className="md:hidden">
          <nav className="flex flex-col gap-4 text-sm font-medium text-slate-200">
            {isAuthenticated ? (
              <>
                <SheetClose asChild>
                  <Link className={baseLinkClasses} href="/promises">
                    {t("nav.myPromises")}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link className={baseLinkClasses} href="/promises?filter=awaiting_my_action">
                    {t("nav.actionQueueBadge")}
                    {actionQueueCount > 0 ? ` (${actionQueueCount})` : ""}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link className={primaryLinkClasses} href="/promises/new">
                    {t("nav.newPromise")}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link className={baseLinkClasses} href="/u">
                    {t("nav.publicProfiles")}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link className={baseLinkClasses} href="/notifications">
                    {t("nav.notifications")}
                  </Link>
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
                <Link className={primaryLinkClasses} href="/login">
                  {t("auth.login.signInCta")}
                </Link>
              </SheetClose>
            )}
          </nav>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}

export default MobileMenu;

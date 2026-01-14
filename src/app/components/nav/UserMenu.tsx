"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import { IconButton } from "@/app/components/ui/IconButton";
import { ProfileSettingsMenu } from "@/app/components/ProfileSettingsMenu";
import { useT } from "@/lib/i18n/I18nProvider";

type UserMenuProps = {
  onLogout?: () => void;
  className?: string;
};

export function UserMenu({ onLogout, className = "" }: UserMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <IconButton
        ariaLabel={t("nav.profileSettings")}
        onClick={() => setOpen((prev) => !prev)}
        active={open}
        icon={<UserRound className="h-4 w-4" aria-hidden />}
      />
      {open && (
        <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-white/10 bg-slate-950/95 p-2 text-sm text-slate-200 shadow-2xl shadow-black/60 backdrop-blur">
          <div className="flex flex-col gap-1">
            <div onClick={() => setOpen(false)}>
              <ProfileSettingsMenu
                variant="text"
                label={t("nav.profileSettings")}
                className="w-full rounded-xl border border-white/10 px-3 py-2 text-left text-slate-100 transition hover:border-emerald-300/40 hover:text-emerald-100"
              />
            </div>
            <Link
              href="/privacy"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-white/10 px-3 py-2 transition hover:border-emerald-300/40 hover:text-emerald-100"
            >
              {t("nav.privacy")}
            </Link>
            <Link
              href="/terms"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-white/10 px-3 py-2 transition hover:border-emerald-300/40 hover:text-emerald-100"
            >
              {t("nav.terms")}
            </Link>
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="rounded-xl border border-white/10 px-3 py-2 text-left text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100"
              >
                {t("nav.logout")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;

"use client";

import { useEffect, useRef, useState } from "react";
import { FileSignature, Plus, Target } from "lucide-react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { IconButton } from "@/app/components/ui/IconButton";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { useT } from "@/lib/i18n/I18nProvider";

export function NewItemMenu({ className }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
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
    <div ref={containerRef} className="relative">
      <Tooltip label={t("nav.create")} placement="top">
        <IconButton
          onClick={() => setOpen((prev) => !prev)}
          ariaLabel={t("nav.create")}
          className={[
            "bg-emerald-400 text-slate-50 shadow-lg shadow-emerald-500/30 hover:bg-emerald-300 hover:text-slate-50 focus-visible:text-slate-50 active:text-slate-50 border-emerald-300/60",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          icon={<Plus className="h-5 w-5 text-slate-50 opacity-100" strokeWidth={2.5} aria-hidden />}
        />
      </Tooltip>
      {open && (
        <div
          role="menu"
          aria-label={t("nav.create")}
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 p-1.5 shadow-xl shadow-black/50 backdrop-blur"
        >
          <LocalizedLink
            href="/promises/new"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/10"
          >
            <FileSignature className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
            <span>
              <span className="block text-sm font-semibold text-slate-100">
                {t("nav.createMenu.promise.title")}
              </span>
              <span className="block text-xs text-slate-400">{t("nav.createMenu.promise.description")}</span>
            </span>
          </LocalizedLink>
          <LocalizedLink
            href="/commitments/new"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/10"
          >
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
            <span>
              <span className="block text-sm font-semibold text-slate-100">
                {t("nav.createMenu.goal.title")}
              </span>
              <span className="block text-xs text-slate-400">{t("nav.createMenu.goal.description")}</span>
            </span>
          </LocalizedLink>
        </div>
      )}
    </div>
  );
}

export default NewItemMenu;

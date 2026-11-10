"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { IconButton } from "@/app/components/ui/IconButton";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { useT } from "@/lib/i18n/I18nProvider";

// «+» in the header: a new deal or a new dispute.
export function NewItemMenu({ className }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "flex cursor-pointer items-center whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-tone-white transition hover:bg-tone-white/5 hover:text-accent-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/40";

  const button = (
    <IconButton
      onClick={() => setOpen((value) => !value)}
      ariaLabel={t("nav.createMenu.label")}
      className={[
        "bg-emerald-400 text-tone-50 shadow-lg shadow-accent-500/30 hover:bg-emerald-300 hover:text-tone-50 focus-visible:text-tone-50 active:text-tone-50 border-accent-300/60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      icon={<Plus className="h-5 w-5 text-tone-50 opacity-100" strokeWidth={2.5} aria-hidden />}
    />
  );

  return (
    <div ref={rootRef} className="relative">
      {open ? button : <Tooltip label={t("nav.createMenu.label")} placement="top">{button}</Tooltip>}
      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-50 mt-2 w-max -translate-x-1/2 rounded-2xl border border-tone-white/10 bg-[var(--surface-popover)] p-1.5 shadow-xl"
        >
          <LocalizedLink role="menuitem" href="/promises/new" className={itemClass} onClick={() => setOpen(false)}>
            {t("nav.createMenu.promise")}
          </LocalizedLink>
          <LocalizedLink role="menuitem" href="/decide/new" className={itemClass} onClick={() => setOpen(false)}>
            {t("nav.createMenu.dispute")}
          </LocalizedLink>
        </div>
      )}
    </div>
  );
}

export default NewItemMenu;

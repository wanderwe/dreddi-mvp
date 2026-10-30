"use client";

import { Plus } from "lucide-react";
import { IconButton } from "@/app/components/ui/IconButton";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { useT } from "@/lib/i18n/I18nProvider";

export function NewItemMenu({ className }: { className?: string }) {
  const t = useT();

  return (
    <Tooltip label={t("nav.create")} placement="top">
      <IconButton
        href="/promises/new"
        ariaLabel={t("nav.create")}
        className={[
          "bg-emerald-400 text-tone-50 shadow-lg shadow-accent-500/30 hover:bg-emerald-300 hover:text-tone-50 focus-visible:text-tone-50 active:text-tone-50 border-accent-300/60",
          className,
        ].filter(Boolean).join(" ")}
        icon={<Plus className="h-5 w-5 text-tone-50 opacity-100" strokeWidth={2.5} aria-hidden />}
      />
    </Tooltip>
  );
}

export default NewItemMenu;

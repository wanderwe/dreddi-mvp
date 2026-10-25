"use client";

import { LocalizedLink } from "@/app/components/LocalizedLink";
import { Plus } from "lucide-react";
import { IconButton } from "@/app/components/ui/IconButton";
import { useLocale } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";

type NewDealButtonProps = {
  label: string;
  className?: string;
  variant?: "text" | "icon";
};

export function NewDealButton({
  label,
  className,
  variant = "text",
}: NewDealButtonProps) {
  const locale = useLocale();
  const baseClasses =
    "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-accent-500/30 transition hover:translate-y-[-1px] hover:shadow-accent-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-tone-950";

  if (variant === "icon") {
    return (
      <IconButton
        href={localizePath("/promises/new", locale)}
        ariaLabel={label}
        className={[
          "bg-emerald-400 text-tone-50 shadow-lg shadow-accent-500/30 hover:bg-emerald-300 hover:text-tone-50 focus-visible:text-tone-50 active:text-tone-50 border-accent-300/60",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        icon={
          <Plus className="h-5 w-5 text-tone-50 opacity-100" strokeWidth={2.5} aria-hidden />
        }
      />
    );
  }

  return (
    <LocalizedLink href="/promises/new" className={[baseClasses, className].filter(Boolean).join(" ")}>
      {label}
    </LocalizedLink>
  );
}

export default NewDealButton;

import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

type ImportantBadgeProps = {
  label: string;
  className?: string;
};

export function ImportantBadge({ label, className }: ImportantBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-300/45 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.25)]",
        className
      )}
    >
      <AlertTriangle className="h-3 w-3 text-amber-200" aria-hidden />
      {label}
    </span>
  );
}

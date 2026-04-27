import { cn } from "@/lib/utils";

type ImportantBadgeProps = {
  label: string;
  className?: string;
};

export function ImportantBadge({ label, className }: ImportantBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300",
        className
      )}
    >
      {label}
    </span>
  );
}

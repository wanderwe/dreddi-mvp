import { AlertTriangle, Check, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusPillTone = "success" | "attention" | "neutral" | "danger";

type StatusPillProps = {
  label: string;
  tone?: StatusPillTone;
  icon?: "check" | "clock" | "warning";
  className?: string;
};

const toneClassMap: Record<StatusPillTone, string> = {
  success: "bg-emerald-300/14 text-emerald-50 ring-1 ring-inset ring-emerald-200/15",
  attention: "bg-amber-200/12 text-amber-50 ring-1 ring-inset ring-amber-200/15",
  neutral: "bg-slate-200/12 text-slate-100 ring-1 ring-inset ring-white/10",
  danger: "bg-rose-300/14 text-rose-50 ring-1 ring-inset ring-rose-200/15",
};

const iconClassName = "h-3.5 w-3.5 text-current opacity-65";

function Icon({ icon }: { icon: NonNullable<StatusPillProps["icon"]> }) {
  if (icon === "check") return <Check className={iconClassName} aria-hidden="true" />;
  if (icon === "warning") return <AlertTriangle className={iconClassName} aria-hidden="true" />;
  return <Clock3 className={iconClassName} aria-hidden="true" />;
}

export function StatusPill({ label, tone = "neutral", icon, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium leading-none",
        toneClassMap[tone],
        className
      )}
    >
      {icon ? <Icon icon={icon} /> : null}
      <span>{label}</span>
    </span>
  );
}

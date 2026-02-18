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
  success: "bg-emerald-400/12 text-emerald-100 ring-1 ring-inset ring-emerald-300/20",
  attention: "bg-amber-400/14 text-amber-100 ring-1 ring-inset ring-amber-300/25",
  neutral: "bg-slate-200/10 text-slate-200 ring-1 ring-inset ring-white/10",
  danger: "bg-red-400/12 text-red-100 ring-1 ring-inset ring-red-300/20",
};

const iconClassName = "h-3.5 w-3.5 text-current opacity-70";

function Icon({ icon }: { icon: NonNullable<StatusPillProps["icon"]> }) {
  if (icon === "check") return <Check className={iconClassName} aria-hidden="true" />;
  if (icon === "warning") return <AlertTriangle className={iconClassName} aria-hidden="true" />;
  return <Clock3 className={iconClassName} aria-hidden="true" />;
}

export function StatusPill({ label, tone = "neutral", icon, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold leading-none",
        toneClassMap[tone],
        className
      )}
    >
      {icon ? <Icon icon={icon} /> : null}
      <span>{label}</span>
    </span>
  );
}

import { AlertTriangle, Check, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusPillTone = "success" | "attention" | "neutral" | "danger";

type StatusPillProps = {
  label: string;
  tone?: StatusPillTone;
  icon?: "check" | "clock" | "warning";
  marker?: "icon" | "none";
  className?: string;
};

const toneClassMap: Record<StatusPillTone, string> = {
  success: "bg-emerald-300/7 text-emerald-100",
  attention: "bg-amber-200/7 text-amber-100",
  neutral: "bg-slate-200/6 text-slate-200",
  danger: "bg-rose-300/7 text-rose-100",
};

const iconClassName = "h-[14px] w-[14px] text-current opacity-70";

function Icon({ icon }: { icon: NonNullable<StatusPillProps["icon"]> }) {
  if (icon === "check") return <Check className={iconClassName} aria-hidden="true" strokeWidth={1.5} />;
  if (icon === "warning") return <AlertTriangle className={iconClassName} aria-hidden="true" strokeWidth={1.5} />;
  return <Clock3 className={iconClassName} aria-hidden="true" strokeWidth={1.5} />;
}

export function StatusPill({ label, tone = "neutral", icon, marker = "none", className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[999px] px-2.5 py-1.5 text-[13px] font-medium leading-none",
        toneClassMap[tone],
        className
      )}
    >
      {marker === "icon" && icon ? (
        <Icon icon={icon} />
      ) : null}
      <span>{label}</span>
    </span>
  );
}

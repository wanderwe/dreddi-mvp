import { type ReactNode } from "react";

type TooltipProps = {
  label: string;
  children: ReactNode;
  className?: string;
  placement?: "bottom" | "bottom-right";
};

const baseTooltipClasses =
  "pointer-events-none absolute top-full z-50 mt-2 whitespace-nowrap rounded-md border border-white/10 bg-slate-950/90 px-2 py-1 text-[11px] font-medium text-slate-100 opacity-0 shadow-lg transition-opacity duration-150 delay-200 group-hover:opacity-100 group-focus-within:opacity-100";

const placementClasses: Record<NonNullable<TooltipProps["placement"]>, string> = {
  bottom: "left-1/2 -translate-x-1/2",
  "bottom-right": "right-0",
};

export function Tooltip({
  label,
  children,
  className = "",
  placement = "bottom",
}: TooltipProps) {
  return (
    <span className={`group relative inline-flex ${className}`}>
      {children}
      <span className={`${baseTooltipClasses} ${placementClasses[placement]}`} role="tooltip">
        {label}
      </span>
    </span>
  );
}

export default Tooltip;

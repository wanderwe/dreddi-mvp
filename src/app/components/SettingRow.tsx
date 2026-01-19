import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SettingRowProps = {
  title: string;
  description?: string;
  right: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function SettingRow({ title, description, right, className, children }: SettingRowProps) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/5 px-4 py-3", className)}>
      <div className="flex items-center">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-sm font-semibold text-white">{title}</div>
          {description ? <p className="text-xs text-slate-300">{description}</p> : null}
        </div>
        <div className="ml-3 shrink-0">{right}</div>
      </div>
      {children}
    </div>
  );
}

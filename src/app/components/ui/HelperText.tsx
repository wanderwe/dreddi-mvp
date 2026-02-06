import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type HelperTextProps = HTMLAttributes<HTMLParagraphElement>;

export function HelperText({ className, ...props }: HelperTextProps) {
  return (
    // Reuse this helper text style for secondary descriptions across settings.
    <p className={cn("text-xs text-slate-300", className)} {...props} />
  );
}

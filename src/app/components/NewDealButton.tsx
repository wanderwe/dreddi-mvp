import Link from "next/link";
import { Plus } from "lucide-react";
import { IconButton } from "@/app/components/ui/IconButton";

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
  const baseClasses =
    "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

  if (variant === "icon") {
    return (
      <IconButton
        href="/promises/new"
        ariaLabel={label}
        className={[
          "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-300 hover:text-slate-950 focus-visible:text-slate-950 active:text-slate-950 border-emerald-300/60",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        icon={
          <Plus className="h-5 w-5 text-slate-950 opacity-100" strokeWidth={2.5} aria-hidden />
        }
      />
    );
  }

  return (
    <Link href="/promises/new" className={[baseClasses, className].filter(Boolean).join(" ")}>
      {label}
    </Link>
  );
}

export default NewDealButton;

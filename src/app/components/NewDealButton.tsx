import Link from "next/link";

type NewDealButtonProps = {
  label: string;
  className?: string;
};

export function NewDealButton({ label, className }: NewDealButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

  return (
    <Link
      href="/promises/new"
      className={[baseClasses, className].filter(Boolean).join(" ")}
    >
      {label}
    </Link>
  );
}

export default NewDealButton;

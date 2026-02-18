import Link from "next/link";
import React from "react";

export type IconButtonProps = {
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
  href?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
};

const baseClasses =
  "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-200/80 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export function IconButton({
  icon,
  active = false,
  onClick,
  ariaLabel,
  className = "",
  href,
  disabled = false,
  type = "button",
}: IconButtonProps) {
  const stateClasses = active
    ? "bg-emerald-400/20 text-emerald-100"
    : "bg-transparent hover:bg-white/5 hover:text-slate-100";
  const disabledClasses = disabled ? "pointer-events-none opacity-60" : "cursor-pointer";
  const combinedClasses = `${baseClasses} ${stateClasses} ${disabledClasses} ${className}`;

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={combinedClasses}>
        {icon}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      disabled={disabled}
      className={combinedClasses}
    >
      {icon}
    </button>
  );
}

export default IconButton;

export function DreddiLogoMark({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dreddi knows logo"
    >
      <rect width="100" height="100" rx="22" fill="#111318" />
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke="#00d4aa"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#00d4aa" strokeWidth="3" />
      <path d="M38 30 L38 70" stroke="#00d4aa" strokeWidth="6" strokeLinecap="round" />
      <path
        d="M38 30 Q66 30 66 50 Q66 70 38 70"
        stroke="#00d4aa"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function DreddiLogo({
  showText = true,
  className = "",
  markClassName = "h-11 w-11",
  titleClassName = "text-lg",
  accentClassName = "text-sm",
  textClassName = "",
  direction = "row",
}: {
  showText?: boolean;
  className?: string;
  markClassName?: string;
  titleClassName?: string;
  accentClassName?: string;
  textClassName?: string;
  direction?: "row" | "column";
}) {
  return (
    <div
      className={`flex ${direction === "column" ? "flex-col items-start" : "items-center"} gap-3 ${className}`}
    >
      <DreddiLogoMark className={markClassName} />
      {showText && (
        <div className={`leading-tight ${textClassName}`}>
          <div className={`font-semibold uppercase tracking-[0.12em] text-emerald-200 ${accentClassName}`}>
            Dreddi
          </div>
          <div className={`font-semibold text-white ${titleClassName}`}>knows</div>
        </div>
      )}
    </div>
  );
}

export default DreddiLogo;

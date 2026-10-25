export function DreddiLogoMark({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dreddi knows logo"
    >
      <defs>
        <linearGradient id="dreddi-glow" x1="8" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: "var(--logo-glow-1)", stopOpacity: "var(--logo-glow-1-opacity)" }} />
          <stop offset="0.55" style={{ stopColor: "var(--logo-glow-2)", stopOpacity: "var(--logo-glow-2-opacity)" }} />
          <stop offset="1" style={{ stopColor: "var(--logo-glow-3)", stopOpacity: "var(--logo-glow-3-opacity)" }} />
        </linearGradient>
        <linearGradient id="dreddi-core" x1="20" y1="18" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: "var(--logo-letter-from)" }} />
          <stop offset="1" style={{ stopColor: "var(--logo-letter-to)" }} />
        </linearGradient>
      </defs>

      <rect x="2.5" y="2.5" width="59" height="59" rx="16" style={{ fill: "var(--logo-plate)" }} />
      <rect
        x="2.5"
        y="2.5"
        width="59"
        height="59"
        rx="16"
        fill="url(#dreddi-glow)"
        opacity="0.9"
      />
      <rect
        x="6.5"
        y="6.5"
        width="51"
        height="51"
        rx="13"
        style={{ fill: "var(--logo-core)", stroke: "var(--logo-rim)", strokeOpacity: "var(--logo-rim-opacity)" }}
      />

      <path
        d="M20 18H33.5C43 18 50 25 50 32C50 39 43 46 33.5 46H20"
        fill="none"
        stroke="url(#dreddi-core)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 24 28 32 20 40"
        fill="none"
        style={{ stroke: "var(--logo-chevron)" }}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
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
          <div className={`font-semibold uppercase tracking-[0.12em] text-accent-200 ${accentClassName}`}>
            Dreddi
          </div>
          <div className={`font-semibold text-tone-white ${titleClassName}`}>knows</div>
        </div>
      )}
    </div>
  );
}

export default DreddiLogo;

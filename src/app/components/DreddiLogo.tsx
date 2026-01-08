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
          <stop stopColor="#5DF0B5" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#4B93FF" stopOpacity="0.8" />
          <stop offset="1" stopColor="#0B1526" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="dreddi-core" x1="20" y1="18" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E7FFF4" />
          <stop offset="1" stopColor="#B6EAD8" />
        </linearGradient>
      </defs>

      <rect x="2.5" y="2.5" width="59" height="59" rx="16" fill="#0B1220" />
      <rect
        x="2.5"
        y="2.5"
        width="59"
        height="59"
        rx="16"
        fill="url(#dreddi-glow)"
        opacity="0.9"
      />
      <rect x="6.5" y="6.5" width="51" height="51" rx="13" stroke="#9DE8C9" strokeOpacity="0.15" />

      <path
        d="M21 15.5h12.8c10 0 18.2 7.8 18.2 16.9C52 42.5 43.8 50 33.8 50H21V15.5Z"
        fill="url(#dreddi-core)"
        fillOpacity="0.95"
      />
      <path
        d="M30.8 41.2c6.46 0 10.96-4.18 10.96-9.8 0-5.58-4.5-9.8-10.96-9.8H29v19.6h1.8Z"
        fill="#0B1220"
        fillOpacity="0.9"
      />
      <path
        d="M27.6 34.4 31.8 38 41 26.4"
        stroke="#0B1220"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27.6 34.4 31.8 38 41 26.4"
        stroke="#36D399"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="20" cy="20" r="4.5" fill="#29D99D" fillOpacity="0.9" />
      <circle cx="44" cy="46" r="3.6" fill="#51A3FF" fillOpacity="0.9" />
      <circle cx="18" cy="44" r="2.8" fill="#E4FCEB" fillOpacity="0.8" />
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

"use client";

// One choice out of a few, with a small caption above: «Хто кому обіцяє», «Хто сперечається»,
// «Закрити суперечку». The same shape everywhere; the chosen one filled green, or, where a green main button
// below would have to compete with it (the dispute forms), outlined.
export function ChoiceToggle<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  tone = "accent",
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  tone?: "accent" | "outline";
}) {
  return (
    <div className={["space-y-2 text-sm text-tone-200", className].filter(Boolean).join(" ")}>
      <span className="block text-xs uppercase tracking-[0.2em] text-accent-200">{label}</span>
      <div className="flex w-full rounded-2xl border border-tone-white/10 bg-tone-white/5 p-1" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`flex-1 cursor-pointer rounded-2xl border-2 px-2 py-1.5 text-sm font-semibold leading-tight transition ${
                tone === "accent"
                  ? active
                    ? "border-transparent bg-emerald-400/90 text-slate-950 shadow shadow-accent-500/20"
                    : "border-transparent text-tone-200 hover:bg-tone-white/10 hover:text-accent-100"
                  : // The dispute forms: the chosen one stands out without the green fill of the main button.
                    active
                    ? "border-emerald-500/80 text-accent-200"
                    : "border-transparent text-tone-400 hover:text-tone-white"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ChoiceToggle;

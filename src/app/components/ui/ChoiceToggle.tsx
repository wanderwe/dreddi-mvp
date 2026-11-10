"use client";

// One choice out of a few, with a small caption above: «Хто кому обіцяє», «Хто сперечається»,
// «Закрити суперечку». The same look everywhere, the chosen one in green.
export function ChoiceToggle<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
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
              className={`flex-1 cursor-pointer rounded-2xl px-2 py-2 text-sm font-semibold leading-tight transition ${
                active
                  ? "bg-emerald-400/90 text-slate-950 shadow shadow-accent-500/20"
                  : "text-tone-200 hover:bg-tone-white/10 hover:text-accent-100"
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

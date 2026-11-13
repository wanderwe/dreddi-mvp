"use client";

import { Info } from "lucide-react";
import { Tooltip } from "@/app/components/ui/Tooltip";

// One choice out of a few, with a small caption above: «Хто кому обіцяє», «Хто сперечається»,
// «Закрити суперечку». The same look everywhere: the chosen one outlined in green, the others muted, so
// the green main button of the form stays the only green fill.
export function ChoiceToggle<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  // What the options mean, behind an info icon next to the caption, as in the promise form.
  hint?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={["space-y-2 text-sm text-tone-200", className].filter(Boolean).join(" ")}>
      <div className="flex items-center gap-1.5">
        <span className="block text-xs uppercase tracking-[0.2em] text-accent-200">{label}</span>
        {hint && (
          <Tooltip label={hint} placement="top" tapToOpen tooltipClassName="!max-w-[min(360px,calc(100vw-32px))]">
            <span aria-label={hint} className="inline-flex items-center justify-center text-tone-500 transition hover:text-accent-100">
              <Info className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Tooltip>
        )}
      </div>
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
                active ? "border-emerald-500/80 text-accent-200" : "border-transparent text-tone-400 hover:text-tone-white"
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

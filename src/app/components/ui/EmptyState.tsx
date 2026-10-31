import type { ReactNode } from "react";

// One look for "nothing here yet" across the deals tabs: what is empty, what to do next, an optional action.
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-tone-white/20 bg-tone-white/5 p-6 text-center text-tone-300">
      <p className="text-base font-semibold text-tone-white">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-tone-400">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

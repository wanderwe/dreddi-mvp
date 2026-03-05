import type { ReactNode } from "react";

type StaticPageLayoutProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

export function StaticPageLayout({ children, className = "", id }: StaticPageLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(82,193,106,0.2),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_60%_70%,rgba(34,55,93,0.22),transparent_45%)]"
        aria-hidden
      />

      <div id={id} className={`relative mx-auto w-full max-w-3xl px-6 py-14 sm:py-16 ${className}`}>
        {children}
      </div>
    </main>
  );
}

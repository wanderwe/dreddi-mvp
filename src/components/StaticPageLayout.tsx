import type { ReactNode } from "react";

type StaticPageLayoutProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

export function StaticPageLayout({ children, className = "", id }: StaticPageLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-tone-950 via-[var(--page-wash-via)] to-[var(--page-wash-to)] text-tone-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,var(--page-wash-1),transparent_30%),radial-gradient(circle_at_70%_10%,var(--page-wash-2),transparent_28%),radial-gradient(circle_at_60%_70%,var(--page-wash-3),transparent_45%)]"
        aria-hidden
      />

      <div id={id} className={`relative mx-auto w-full max-w-3xl px-6 py-14 sm:py-16 ${className}`}>
        {children}
      </div>
    </main>
  );
}

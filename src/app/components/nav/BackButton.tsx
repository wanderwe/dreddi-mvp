"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useT } from "@/lib/i18n/I18nProvider";

type BackButtonProps = {
  fallbackHref: string;
  className?: string;
  label?: string;
};

export function BackButton({ fallbackHref, className = "", label }: BackButtonProps) {
  const router = useRouter();
  const t = useT();

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }, [fallbackHref, router]);

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {label ?? t("nav.back")}
    </button>
  );
}

export default BackButton;

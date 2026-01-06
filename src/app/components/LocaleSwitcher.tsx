"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Locale, locales } from "@/lib/i18n/locales";
import { useLocale } from "@/lib/i18n/I18nProvider";

export function LocaleSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLocale = async (nextLocale: Locale) => {
    if (nextLocale === locale) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not update language");
      }

      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold uppercase text-slate-200">
        {locales.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => void updateLocale(code)}
            disabled={busy || code === locale}
            aria-pressed={code === locale}
            className={`rounded-full px-3 py-1 transition ${
              code === locale
                ? "bg-emerald-400/20 text-emerald-100"
                : "text-slate-200 hover:text-emerald-100"
            } ${busy ? "opacity-70" : ""}`}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
      {error && <div className="mt-1 text-[11px] text-red-300">{error}</div>}
    </div>
  );
}

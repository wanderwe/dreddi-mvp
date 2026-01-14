"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Locale, locales } from "@/lib/i18n/locales";
import { useLocale } from "@/lib/i18n/I18nProvider";
import { IconButton } from "@/app/components/ui/IconButton";

export function LocaleSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const updateLocale = async (nextLocale: Locale) => {
    if (nextLocale === locale) return;

    setBusy(true);
    setToast(null);

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

      try {
        router.refresh();
      } catch {
        window.location.reload();
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to switch locale", err);
      }
      showToast("We couldn't switch the language. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        {locales.map((code) => (
          <IconButton
            key={code}
            onClick={() => void updateLocale(code)}
            disabled={busy || code === locale}
            active={code === locale}
            ariaLabel={
              code === locale ? `${code.toUpperCase()} selected` : `Switch to ${code.toUpperCase()}`
            }
            icon={
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                {code.toUpperCase()}
              </span>
            }
          />
        ))}
      </div>
      {toast && (
        <div
          className="mt-2 w-max rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[11px] text-red-100 shadow-sm"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

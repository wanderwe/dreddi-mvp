"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Locale, locales } from "@/lib/i18n/locales";
import { useLocale } from "@/lib/i18n/I18nProvider";
import { requireSupabase } from "@/lib/supabaseClient";
import { IconButton } from "@/app/components/ui/IconButton";

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
      let authHeader: Record<string, string> = {};
      try {
        const supabase = requireSupabase();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          authHeader = { Authorization: `Bearer ${token}` };
        }
      } catch {
        authHeader = {};
      }

      const res = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
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
      {error && <div className="mt-1 text-[11px] text-red-300">{error}</div>}
    </div>
  );
}

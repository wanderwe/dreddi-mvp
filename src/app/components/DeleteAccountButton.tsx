"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { requireSupabase } from "@/lib/supabaseClient";

async function accessToken() {
  const { data } = await requireSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

// "Delete account" in the profile menu: a dialog that asks to type a word, then starts the 30-day
// grace period and signs the person out.
export function DeleteAccountButton({ disabled = false }: { disabled?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [activeDeals, setActiveDeals] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmWord = t("account.delete.confirmWord");
  const canSubmit = confirmText.trim().toUpperCase() === confirmWord.toUpperCase() && !submitting;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const token = await accessToken();
        const res = await fetch("/api/account/delete", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const body = (await res.json().catch(() => null)) as { activeSharedDeals?: number } | null;
        if (active && res.ok) setActiveDeals(body?.activeSharedDeals ?? 0);
      } catch {
        // The count is a hint: the dialog works without it.
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  const close = () => {
    if (submitting) return;
    setOpen(false);
    setConfirmText("");
    setError(null);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await accessToken();
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ locale }),
      });
      if (!res.ok) throw new Error();
      await requireSupabase().auth.signOut().catch(() => null);
      window.location.replace(localizePath("/", locale));
    } catch {
      setError(t("account.delete.error"));
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="mt-3 w-full cursor-pointer rounded-xl px-3 py-2 text-sm font-medium text-danger-300 transition hover:text-danger-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-400/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("account.delete.button")}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-tone-950/80 backdrop-blur-sm"
              onClick={close}
              aria-label={t("account.delete.cancel")}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
              className="relative z-10 w-full max-w-md rounded-2xl border border-tone-white/10 bg-[var(--surface-popover)] p-4 shadow-2xl shadow-tone-black/60 sm:p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 id="delete-account-title" className="text-base font-semibold text-tone-white">
                  {t("account.delete.title")}
                </h3>
                <button
                  type="button"
                  onClick={close}
                  className="cursor-pointer rounded-lg border border-tone-white/10 p-1.5 text-tone-200 transition hover:border-tone-white/30"
                  aria-label={t("account.delete.cancel")}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-tone-200">{t("account.delete.body")}</p>
                {activeDeals !== null && activeDeals > 0 && (
                  <p className="rounded-xl border border-warn-400/30 bg-amber-500/10 px-3 py-2 text-sm text-warn-200">
                    {t("account.delete.activeDeals", { count: activeDeals })}
                  </p>
                )}

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-tone-200">{t("account.delete.confirmLabel")}</span>
                  <input
                    value={confirmText}
                    onChange={(event) => setConfirmText(event.target.value)}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="w-full rounded-xl border border-tone-white/10 bg-tone-white/[0.03] px-3 py-2 text-sm text-tone-white outline-none transition placeholder:text-tone-400 focus:border-danger-400/50"
                  />
                </label>

                {error && (
                  <div className="rounded-xl border border-danger-400/30 bg-red-500/10 px-3 py-2 text-xs text-danger-200">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    disabled={submitting}
                    className="cursor-pointer rounded-xl border border-tone-white/10 px-3 py-2 text-sm text-tone-200 transition hover:border-tone-white/30"
                  >
                    {t("account.delete.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit}
                    className="cursor-pointer rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("account.delete.submit")}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

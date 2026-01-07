"use client";

import Link from "next/link";
import { useState } from "react";
import { DreddiLogoMark } from "@/app/components/DreddiLogo";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n/I18nProvider";

export default function LoginPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink() {
    setBusy(true);
    setError(null);

    if (!supabase) {
      setBusy(false);
      setError("Authentication is unavailable in this preview.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });

    setBusy(false);

    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(82,193,106,0.22),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_55%_65%,rgba(34,55,93,0.18),transparent_40%)]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/40 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">
                {t("auth.login.eyebrow")}
              </p>
              <h1 className="text-4xl font-semibold text-white">Dreddi knows</h1>
              <p className="text-slate-300">{t("auth.login.subtitle")}</p>
            </div>
            <DreddiLogoMark className="h-12 w-12 drop-shadow-[0_0_18px_rgba(52,211,153,0.25)]" />
          </div>

          <div className="mt-6 space-y-4">
            <label className="space-y-2 text-sm text-slate-200">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("auth.login.emailLabel")}
              </span>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                placeholder={t("auth.login.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <button
              onClick={sendMagicLink}
              disabled={busy || !email}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 disabled:translate-y-0 disabled:opacity-60"
            >
              {busy ? t("auth.login.sending") : t("auth.login.sendLink")}
            </button>

            {sent && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                {t("auth.login.sent")}
              </div>
            )}

            {error && <div className="text-sm text-red-400">{error}</div>}

            <div className="flex items-center justify-between text-sm text-slate-400">
              <Link href="/" className="text-emerald-200 hover:text-emerald-100">
                ← {t("auth.login.back")}
              </Link>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {t("auth.login.secure")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

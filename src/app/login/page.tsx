"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { DreddiLogoMark } from "@/app/components/DreddiLogo";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n/I18nProvider";
import { stripTrailingPeriod } from "@/lib/text";

export default function LoginPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setOauthBusy(true);
    setError(null);

    if (!supabase) {
      setOauthBusy(false);
      setError("Authentication is unavailable in this preview.");
      return;
    }

    const next = searchParams.get("next");
    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      redirectTo.searchParams.set("next", next);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });

    if (error) {
      setError(error.message);
      setOauthBusy(false);
    }
  }

  async function sendMagicLink() {
    setBusy(true);
    setError(null);

    if (!supabase) {
      setBusy(false);
      setError("Authentication is unavailable in this preview.");
      return;
    }

    const next = searchParams.get("next");
    // Supabase redirect URLs must include your localhost origin in the dashboard.
    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      redirectTo.searchParams.set("next", next);
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo.toString() },
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
              <p className="text-slate-300">
                {stripTrailingPeriod(t("auth.login.subtitle"))}
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-200/80">
                <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                <span>{t("auth.login.secure")}</span>
              </div>
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
              onClick={signInWithGoogle}
              disabled={oauthBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-white/20 transition hover:translate-y-[-1px] hover:shadow-white/30 disabled:translate-y-0 disabled:opacity-60"
            >
              {oauthBusy
                ? t("auth.login.googleSigningIn")
                : t("auth.login.googleCta")}
            </button>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
              <span className="h-px flex-1 bg-white/10" />
              <span>{t("auth.login.or")}</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <button
              onClick={sendMagicLink}
              disabled={busy || !email || oauthBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-transparent px-4 py-3 text-base font-semibold text-emerald-200 transition hover:border-emerald-300/70 hover:text-emerald-100 disabled:opacity-60"
            >
              {busy ? t("auth.login.sending") : t("auth.login.sendLink")}
            </button>

            {sent && (
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-200 shadow-inner shadow-black/30">
                <span className="block border-l-2 border-emerald-400/50 pl-3">
                  {t("auth.login.sent")}
                </span>
              </div>
            )}

            {error && <div className="text-sm text-red-400">{error}</div>}

          </div>
        </div>
      </div>
    </main>
  );
}

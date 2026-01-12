"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DreddiLogoMark } from "@/app/components/DreddiLogo";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n/I18nProvider";

export default function LoginPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownActive = cooldownSeconds > 0;
  const cooldownTotalSeconds = 8;

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownSeconds(0);
      return;
    }

    const update = () => {
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      setCooldownSeconds(Math.max(0, remaining));
    };

    update();
    const interval = window.setInterval(update, 500);
    return () => window.clearInterval(interval);
  }, [cooldownUntil]);

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

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
      setCooldownUntil(Date.now() + cooldownTotalSeconds * 1000);
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }
    }
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
              disabled={busy || !email || cooldownActive}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-semibold transition ${
                sent
                  ? "border border-white/10 bg-white/5 text-slate-100 shadow-inner shadow-black/30 disabled:opacity-70"
                  : "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 hover:translate-y-[-1px] hover:shadow-emerald-400/50"
              } disabled:translate-y-0`}
            >
              {busy
                ? t("auth.login.sending")
                : sent
                  ? cooldownActive
                    ? t("auth.login.sentLabel")
                    : t("auth.login.resendLink")
                  : t("auth.login.sendLink")}
              {sent && cooldownActive && <span aria-hidden>✓</span>}
            </button>

            {sent && cooldownActive && (
              <p className="text-xs text-slate-400">
                {t("auth.login.cooldown", { seconds: cooldownSeconds })}
              </p>
            )}

            {sent && (
              <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-100 shadow-inner shadow-black/30">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-emerald-300">✓</span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {t("auth.login.successTitle")}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {t("auth.login.successInstruction")}
                    </p>
                  </div>
                </div>
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

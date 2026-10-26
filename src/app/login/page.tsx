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

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString(), skipBrowserRedirect: true },
    });

    if (error) {
      setError(error.message);
      setOauthBusy(false);
      return;
    }

    if (data?.url) {
      window.location.assign(data.url);
    } else {
      setError(t("auth.login.googleError"));
      setOauthBusy(false);
    }
  }

  async function sendMagicLink() {
    setBusy(true);
    setError(null);
    setSent(false);

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
    }
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-tone-950 via-[var(--page-wash-via)] to-[var(--page-wash-to)] text-tone-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--auth-wash-1),transparent_30%),radial-gradient(circle_at_70%_10%,var(--auth-wash-2),transparent_28%),radial-gradient(circle_at_55%_65%,var(--auth-wash-3),transparent_40%)]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-tone-white/10 bg-tone-black/40 p-8 shadow-2xl shadow-tone-black/40 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.2em] text-accent-200">
                {t("auth.login.eyebrow")}
              </p>
              <h1 className="text-4xl font-semibold text-tone-white">Dreddi knows</h1>
              <p className="text-tone-300">
                {stripTrailingPeriod(t("auth.login.subtitle"))}
              </p>
            </div>
            <DreddiLogoMark className="h-12 w-12 drop-shadow-[0_0_18px_rgba(52,211,153,0.25)]" />
          </div>

          <div className="mt-6 space-y-4">
            <label className="block space-y-2 text-sm text-tone-200">
              <span className="block text-xs uppercase tracking-[0.2em] text-accent-200">
                {t("auth.login.emailLabel")}
              </span>
              <input
                className="block w-full rounded-xl border border-tone-white/10 bg-tone-white/5 px-4 py-3 text-tone-white outline-none transition focus:border-accent-300/60 focus:ring-2 focus:ring-accent-400/40"
                placeholder={t("auth.login.emailPlaceholder")}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSent(false);
                }}
              />
            </label>

            <button
              onClick={sendMagicLink}
              disabled={busy || !email || oauthBusy}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-accent-500/30 transition hover:translate-y-[-1px] hover:bg-emerald-300 hover:shadow-accent-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-tone-950 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
            >
              {busy ? t("auth.login.sending") : t("auth.login.sendLink")}
            </button>

            {sent && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-accent-400/50 bg-emerald-500/15 p-4 text-sm text-accent-100 shadow-lg shadow-accent-500/10"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/80 text-xs font-semibold text-slate-950">
                    ✓
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-accent-50">
                      {t("auth.login.sentTitle")}
                    </p>
                    <p className="text-sm text-accent-100/90">
                      {t("auth.login.sentBody")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-accent-200/80">
              <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
              <span>{t("auth.login.secure")}</span>
            </div>

            <div className="flex items-center gap-3 pt-2 text-xs uppercase tracking-[0.2em] text-tone-400">
              <span className="h-px flex-1 bg-tone-white/10" />
              <span>{t("auth.login.or")}</span>
              <span className="h-px flex-1 bg-tone-white/10" />
            </div>

            <button
              onClick={signInWithGoogle}
              disabled={oauthBusy}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-tone-white/20 bg-tone-white/5 px-4 py-2.5 text-sm font-semibold text-tone-100 transition hover:border-tone-white/40 hover:bg-tone-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-tone-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 48 48"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.45 0 6.55 1.2 8.98 3.55l6.67-6.67C35.6 2.55 30.1 0 24 0 14.62 0 6.52 5.38 2.7 13.22l7.77 6.04C12.24 13.1 17.7 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.15 24.5c0-1.64-.15-3.22-.43-4.75H24v9h12.5c-.54 2.9-2.18 5.35-4.67 7l7.18 5.57c4.2-3.88 6.64-9.6 6.64-16.82z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.47 28.26a14.5 14.5 0 0 1 0-8.52L2.7 13.7a24 24 0 0 0 0 20.6l7.77-6.04z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.1 0 11.23-2.02 14.97-5.5l-7.18-5.57c-2 1.34-4.56 2.12-7.79 2.12-6.3 0-11.76-3.6-13.53-8.76l-7.77 6.04C6.52 42.62 14.62 48 24 48z"
                />
              </svg>
              {oauthBusy
                ? t("auth.login.googleSigningIn")
                : t("auth.login.googleCta")}
            </button>

            {error && <div className="text-sm text-danger-400">{error}</div>}

          </div>
        </div>
      </div>
    </main>
  );
}

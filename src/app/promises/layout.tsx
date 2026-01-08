"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DreddiLogo } from "@/app/components/DreddiLogo";
import { HeaderActions } from "@/app/components/HeaderActions";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { useT } from "@/lib/i18n/I18nProvider";
import { requireSupabase } from "@/lib/supabaseClient";

export default function PromisesLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isAuthenticated = Boolean(email);
  const t = useT();

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      let supabase;
      try {
        supabase = requireSupabase();
      } catch (error) {
        if (!active) return;
        setSupabaseError(
          error instanceof Error ? error.message : "Authentication is unavailable in this preview."
        );
        setEmail(null);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setEmail(data.session?.user?.email ?? null);
      if (!data.session) {
        window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
      }
    };

    void syncSession();

    let subscription:
      | {
          data: { subscription: { unsubscribe: () => void } };
        }
      | null = null;
    try {
      const supabase = requireSupabase();
      subscription = supabase.auth.onAuthStateChange((_e, session) => {
        if (!active) return;
        setEmail(session?.user?.email ?? null);
        if (!session) {
          window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
        }
      });
    } catch (error) {
      if (active) {
        setSupabaseError(
          error instanceof Error
            ? error.message
            : "Authentication is unavailable in this preview."
        );
      }
    }

    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, [pathname]);

  async function logout() {
    try {
      const supabase = requireSupabase();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
      setSupabaseError(
        error instanceof Error ? error.message : "Authentication is unavailable in this preview."
      );
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(82,193,106,0.2),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_60%_70%,rgba(34,55,93,0.22),transparent_45%)]" aria-hidden />

      <header className="relative border-b border-white/10 bg-black/30/50 backdrop-blur">
        <div className="relative mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-4 px-6 py-4 md:flex-wrap">
          <Link href="/" className="flex min-w-0 items-center text-white">
            <DreddiLogo
              accentClassName="text-xs"
              markClassName="h-11 w-11"
              titleClassName="text-lg"
            />
          </Link>

          <HeaderActions
            className="hidden md:flex"
            isAuthenticated={isAuthenticated}
            onLogout={logout}
          />
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="promises-mobile-menu"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white shadow-sm shadow-black/20 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:hidden"
          >
            <span className="flex h-5 w-5 flex-col items-center justify-center gap-1">
              <span className="h-0.5 w-5 rounded-full bg-white" />
              <span className="h-0.5 w-5 rounded-full bg-white" />
              <span className="h-0.5 w-5 rounded-full bg-white" />
            </span>
          </button>
          {mobileMenuOpen && (
            <div
              id="promises-mobile-menu"
              className="absolute right-6 top-full mt-3 w-[220px] rounded-2xl border border-white/10 bg-slate-950/95 p-4 text-sm text-slate-200 shadow-xl shadow-black/40 backdrop-blur md:hidden"
            >
              <div className="flex flex-col gap-3">
                <Link
                  href="/promises/new"
                  className="rounded-xl border border-white/10 px-3 py-2 text-left font-medium text-white transition hover:border-emerald-300/50 hover:text-emerald-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("nav.newPromise")}
                </Link>
                <Link
                  href="/promises"
                  className="rounded-xl border border-white/10 px-3 py-2 text-left font-medium text-white transition hover:border-emerald-300/50 hover:text-emerald-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("nav.myPromises")}
                </Link>
                <div className="w-fit">
                  <LocaleSwitcher />
                </div>
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void logout();
                    }}
                    className="rounded-xl border border-white/10 px-3 py-2 text-left font-medium text-white transition hover:border-emerald-300/50 hover:text-emerald-100"
                  >
                    {t("nav.logout")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="relative">
        {supabaseError ? (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-16 text-center text-slate-200">
            <h1 className="text-3xl font-semibold text-white">Authentication unavailable</h1>
            <p className="text-sm text-slate-300">{supabaseError}</p>
            <Link
              href="/"
              className="mx-auto inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Back to home
            </Link>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

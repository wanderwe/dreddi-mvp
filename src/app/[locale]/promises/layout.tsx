"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DreddiLogo } from "@/app/components/DreddiLogo";
import { supabase } from "@/lib/supabaseClient";

export default function PromisesLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const { locale } = useParams<{ locale: string }>();
  const localePrefix = useMemo(() => `/${locale}`, [locale]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = localePrefix;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(82,193,106,0.2),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_60%_70%,rgba(34,55,93,0.22),transparent_45%)]" aria-hidden />

      <header className="relative border-b border-white/10 bg-black/30/50 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href={localePrefix} className="flex items-center text-white">
            <DreddiLogo
              accentClassName="text-xs"
              markClassName="h-11 w-11"
              titleClassName="text-lg"
            />
          </Link>

          <nav className="flex items-center gap-3 text-sm font-medium text-slate-200">
            <Link
              className="rounded-xl border border-transparent px-3 py-1.5 transition hover:border-emerald-300/40 hover:text-emerald-100"
              href={`${localePrefix}/promises`}
            >
              My promises
            </Link>
            <Link
              className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/45"
              href={`${localePrefix}/promises/new`}
            >
              New promise
            </Link>
            {email && (
              <button
                onClick={logout}
                className="rounded-xl px-3 py-1.5 text-slate-300 transition hover:text-emerald-200"
              >
                Log out
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="relative">{children}</main>
    </div>
  );
}

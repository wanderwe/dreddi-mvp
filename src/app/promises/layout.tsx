"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { requireSupabase } from "@/lib/supabaseClient";

export default function PromisesLayout({ children }: { children: React.ReactNode }) {
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const pathname = usePathname();
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
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(82,193,106,0.2),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_60%_70%,rgba(34,55,93,0.22),transparent_45%)]" aria-hidden />

      <main className="relative">
        {supabaseError ? (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-16 text-center text-slate-200">
            <h1 className="text-3xl font-semibold text-white">Authentication unavailable</h1>
            <p className="text-sm text-slate-300">{supabaseError}</p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

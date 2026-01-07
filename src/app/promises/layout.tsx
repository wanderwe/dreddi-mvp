"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DreddiLogo } from "@/app/components/DreddiLogo";
import { HeaderActions } from "@/app/components/HeaderActions";
import { supabase } from "@/lib/supabaseClient";

export default function PromisesLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const pathname = usePathname();
  const isAuthenticated = Boolean(email);

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setEmail(data.session?.user?.email ?? null);
      if (!data.session) {
        window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
      }
    };

    void syncSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      setEmail(session?.user?.email ?? null);
      if (!session) {
        window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(82,193,106,0.2),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_60%_70%,rgba(34,55,93,0.22),transparent_45%)]" aria-hidden />

      <header className="relative border-b border-white/10 bg-black/30/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center text-white">
            <DreddiLogo
              accentClassName="text-xs"
              markClassName="h-11 w-11"
              titleClassName="text-lg"
            />
          </Link>

          <HeaderActions isAuthenticated={isAuthenticated} onLogout={logout} />
        </div>
      </header>

      <main className="relative">{children}</main>
    </div>
  );
}

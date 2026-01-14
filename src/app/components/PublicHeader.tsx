"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DreddiLogo } from "@/app/components/DreddiLogo";
import { HeaderActions } from "@/app/components/HeaderActions";
import { MobileMenu } from "@/app/components/MobileMenu";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";

export function PublicHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const isAuthenticated = Boolean(email);

  useEffect(() => {
    let active = true;
    const client = supabase;

    if (!client) return;

    const syncSession = async () => {
      const { data: sessionData } = await client.auth.getSession();
      if (!active) return;
      setEmail(sessionData.session?.user?.email ?? null);
    };

    void syncSession();

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setEmail(null);
  };

  return (
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
        <MobileMenu isAuthenticated={isAuthenticated} onLogout={logout} />
      </div>
    </header>
  );
}

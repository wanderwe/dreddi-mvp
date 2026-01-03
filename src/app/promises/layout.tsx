"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PromisesLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);

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
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-900">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            Dreddi knows
          </Link>

          <nav className="flex items-center gap-3 text-sm">
            <Link className="text-neutral-300 hover:text-white" href="/promises">
              My promises
            </Link>
            <Link
              className="rounded-lg bg-white text-neutral-950 px-3 py-1.5 font-medium"
              href="/promises/new"
            >
              New
            </Link>
            {email && (
              <button
                onClick={logout}
                className="text-neutral-300 hover:text-white"
              >
                Log out
              </button>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

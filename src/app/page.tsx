"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  async function syncSession() {
    const { data } = await supabase.auth.getSession();
    setEmail(data.session?.user?.email ?? null);
    setReady(true);
  }

  useEffect(() => {
    syncSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    // onAuthStateChange оновить UI
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <div className="w-full max-w-md space-y-5 p-6 text-center">
        <h1 className="text-5xl font-semibold">Dreddi knows</h1>
        <p className="text-neutral-400">Фіксуй обіцянки. Будуй довіру.</p>

        {!ready ? (
          <div className="text-neutral-500">Loading…</div>
        ) : !email ? (
          <Link
            href="/login"
            className="block w-full rounded-xl bg-white text-neutral-950 font-medium py-3"
          >
            Log in
          </Link>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-neutral-400">Logged in as</div>
            <div className="text-neutral-200">{email}</div>

            <Link
              href="/promises/new"
              className="block w-full rounded-xl bg-white text-neutral-950 font-medium py-3"
            >
              Create a promise
            </Link>

            <Link
              href="/promises"
              className="block w-full rounded-xl border border-neutral-800 bg-neutral-900/40 text-white font-medium py-3"
            >
              My promises
            </Link>

            <button
              onClick={logout}
              className="w-full rounded-xl border border-neutral-800 bg-transparent text-neutral-200 font-medium py-3"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

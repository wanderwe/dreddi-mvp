"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink() {
    setBusy(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });

    setBusy(false);

    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <div className="w-full max-w-md space-y-5 p-6">
        <h1 className="text-3xl font-semibold">Dreddi knows</h1>
        <p className="text-neutral-400">Увійди, щоб створювати обіцянки.</p>

        <input
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3 outline-none"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={sendMagicLink}
          disabled={busy || !email}
          className="w-full rounded-xl bg-white text-neutral-950 font-medium py-3 disabled:opacity-60"
        >
          {busy ? "Sending..." : "Send magic link"}
        </button>

        {sent && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm">
            Лінк відправлено ✅ Перевір пошту (і Spam).
          </div>
        )}

        {error && <div className="text-sm text-red-400">{error}</div>}
      </div>
    </main>
  );
}

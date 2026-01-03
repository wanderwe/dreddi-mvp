"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NewPromisePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createPromise() {
    setBusy(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("promises")
      .insert({
        creator_id: user.id,
        title,
        details: details || null,
        counterparty_contact: counterparty || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      })
      .select("id")
      .single();

    setBusy(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/promises/${data.id}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <div className="w-full max-w-md space-y-4 p-6">
        <h1 className="text-3xl font-semibold">New promise</h1>

        <input
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3 outline-none"
          placeholder="Коротко: що ти обіцяєш?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3 outline-none min-h-[110px]"
          placeholder="Деталі (опціонально)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />

        <input
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3 outline-none"
          placeholder="Кому (email/телефон/нік) — опціонально"
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
        />

        <input
          type="datetime-local"
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3 outline-none"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />

        <button
          onClick={createPromise}
          disabled={busy || !title.trim()}
          className="w-full rounded-xl bg-white text-neutral-950 font-medium py-3 disabled:opacity-60"
        >
          {busy ? "Creating..." : "Create"}
        </button>

        {error && <div className="text-sm text-red-400">{error}</div>}
      </div>
    </main>
  );
}

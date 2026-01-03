"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PromiseRow = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  created_at: string;
};

export default function PromisesPage() {
  const [rows, setRows] = useState<PromiseRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("promises")
        .select("id,title,status,due_at,created_at")
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setRows(data ?? []);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto w-full max-w-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">My promises</h1>
          <Link
            href="/promises/new"
            className="rounded-xl bg-white text-neutral-950 font-medium px-4 py-2"
          >
            New
          </Link>
        </div>

        {error && <div className="text-red-400">{error}</div>}

        <div className="space-y-3">
          {rows.map((p) => (
            <Link
              key={p.id}
              href={`/promises/${p.id}`}
              className="block rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 hover:bg-neutral-900/60"
            >
              <div className="font-medium">{p.title}</div>
              <div className="text-sm text-neutral-400">
                status: {p.status}
                {p.due_at ? ` • due: ${new Date(p.due_at).toLocaleString()}` : ""}
              </div>
            </Link>
          ))}

          {rows.length === 0 && (
            <div className="text-neutral-500">Поки що немає обіцянок.</div>
          )}
        </div>
      </div>
    </main>
  );
}

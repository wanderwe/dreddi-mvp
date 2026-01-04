"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type PromiseRow = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  created_at: string;
};

type TabKey = "i-promised" | "promised-to-me";

export default function PromisesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab: TabKey = (searchParams.get("tab") as TabKey) ?? "i-promised";

  const [rows, setRows] = useState<PromiseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const roleColumn = useMemo(() => {
    // IMPORTANT: columns in DB must exist: promisor_id, promisee_id
    return tab === "promised-to-me" ? "promisee_id" : "promisor_id";
  }, [tab]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        if (!cancelled) setError(userErr.message);
        setLoading(false);
        return;
      }

      const user = userData.user;
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("promises")
        .select("id,title,status,due_at,created_at")
        .eq(roleColumn, user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) setError(error.message);
      else setRows(data ?? []);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [roleColumn]);

  const setTab = (next: TabKey) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", next);
    router.push(`/promises?${sp.toString()}`);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto w-full max-w-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              {tab === "i-promised" ? "I promised" : "Promised to me"}
            </h1>
            <div className="text-sm text-neutral-400">
              {tab === "i-promised"
                ? "Promises where you are the promisor"
                : "Promises where you are the promisee"}
            </div>
          </div>

          <Link
            href="/promises/new"
            className="rounded-xl bg-white text-neutral-950 font-medium px-4 py-2"
          >
            + New
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("i-promised")}
            className={[
              "rounded-xl px-4 py-2 text-sm font-medium border",
              tab === "i-promised"
                ? "bg-white text-neutral-950 border-white"
                : "bg-transparent text-white border-neutral-800 hover:bg-neutral-900/40",
            ].join(" ")}
          >
            I promised
          </button>

          <button
            type="button"
            onClick={() => setTab("promised-to-me")}
            className={[
              "rounded-xl px-4 py-2 text-sm font-medium border",
              tab === "promised-to-me"
                ? "bg-white text-neutral-950 border-white"
                : "bg-transparent text-white border-neutral-800 hover:bg-neutral-900/40",
            ].join(" ")}
          >
            Promised to me
          </button>
        </div>

        {error && <div className="text-red-400">{error}</div>}

        <div className="space-y-3">
          {loading && <div className="text-neutral-400">Loading…</div>}

          {!loading &&
            rows.map((p) => (
              <Link
                key={p.id}
                href={`/promises/${p.id}`}
                className="block rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 hover:bg-neutral-900/60"
              >
                <div className="font-medium">{p.title}</div>
                <div className="text-sm text-neutral-400">
                  status: {p.status}
                  {p.due_at
                    ? ` • due: ${new Date(p.due_at).toLocaleString()}`
                    : " • no deadline"}
                </div>
              </Link>
            ))}

          {!loading && rows.length === 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 text-neutral-400">
              {tab === "i-promised"
                ? "You haven’t created any promises yet."
                : "Nothing has been promised to you yet (accept an invite link)."}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

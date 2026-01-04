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
  counterparty_id: string | null;
};

type TabKey = "i-promised" | "promised-to-me";

const formatDue = (dueAt: string | null) => {
  if (!dueAt) return "No deadline";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dueAt));
};

export default function PromisesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab: TabKey = (searchParams.get("tab") as TabKey) ?? "i-promised";

  const [rows, setRows] = useState<PromiseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const roleColumn = useMemo(() => {
    return tab === "promised-to-me" ? "counterparty_id" : "creator_id";
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
        .select("id,title,status,due_at,created_at,counterparty_id")
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
    <main className="relative py-10">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(74,222,128,0.08),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(74,144,226,0.08),transparent_28%)]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-5xl px-6 space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Promises</p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                {tab === "i-promised" ? "I promised" : "Promised to me"}
              </h1>
              <p className="text-sm text-slate-300">
                {tab === "i-promised"
                  ? "Promises where you are the promisor"
                  : "Promises where you are the promisee"}
              </p>
            </div>

            <Link
              href="/promises/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50"
            >
              <span className="text-lg">＋</span>
              New promise
            </Link>
          </div>

          <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-black/30">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</div>
              <div className="mt-1 text-2xl font-semibold text-white">{rows.length}</div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-emerald-100 shadow-inner shadow-black/30">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">Active</div>
              <div className="mt-1 text-lg font-semibold">{rows.filter((p) => p.status === "active").length}</div>
            </div>
            <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-amber-50 shadow-inner shadow-black/30">
              <div className="text-xs uppercase tracking-[0.2em] text-amber-200">Pending</div>
              <div className="mt-1 text-lg font-semibold">{rows.filter((p) => !p.counterparty_id).length}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/30 p-4 shadow-xl shadow-black/30 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("i-promised")}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition",
                tab === "i-promised"
                  ? "bg-emerald-400 text-slate-950 ring-emerald-300 shadow-lg shadow-emerald-500/25"
                  : "bg-white/5 text-white ring-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              I promised
            </button>

            <button
              type="button"
              onClick={() => setTab("promised-to-me")}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition",
                tab === "promised-to-me"
                  ? "bg-emerald-400 text-slate-950 ring-emerald-300 shadow-lg shadow-emerald-500/25"
                  : "bg-white/5 text-white ring-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              Promised to me
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {loading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[82px] animate-pulse rounded-2xl bg-white/5" />
                ))}
              </div>
            )}

            {!loading &&
              rows.map((p) => (
                <Link
                  key={p.id}
                  href={`/promises/${p.id}`}
                  className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-300/40 hover:bg-emerald-500/5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm uppercase tracking-[0.18em] text-emerald-200">Promise</div>
                      <div className="text-lg font-semibold text-white group-hover:text-emerald-100">{p.title}</div>
                      <div className="text-sm text-slate-300">Due: {formatDue(p.due_at)}</div>
                    </div>

                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                      Status: {p.status}
                    </span>
                  </div>
                </Link>
              ))}

            {!loading && rows.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-slate-300">
                <p className="text-lg font-semibold text-white">Nothing here yet</p>
                <p className="text-sm text-slate-400">
                  {tab === "i-promised"
                    ? "You haven’t created any promises yet. Start a new one to track your commitments."
                    : "Nothing has been promised to you yet. Accept an invite link to get started."}
                </p>
                <div className="mt-4">
                  <Link
                    href="/promises/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50"
                  >
                    Create promise
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

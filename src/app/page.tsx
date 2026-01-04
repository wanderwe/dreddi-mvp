"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DreddiLogoMark } from "@/app/components/DreddiLogo";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const highlights = [
    "Promises tracked.",
    "Reputation intact.",
    "Dreddi knows.",
  ];

  const showcasePromises = [
    { title: "Dreddi Alert", meta: "Review Pending • 3:32PM" },
    { title: "Buy Car Parts", meta: "Complete Task • Due today" },
    { title: "Delivery Completed", meta: "Deal review • 2h ago" },
  ];

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setEmail(data.session?.user?.email ?? null);
      setReady(true);
    };

    void syncSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user?.email ?? null);
      setReady(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    // onAuthStateChange оновить UI
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(82,193,106,0.22),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_55%_65%,rgba(34,55,93,0.18),transparent_40%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-16 px-6 py-14 md:flex-row md:items-center">
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(74,222,128,0.25)]" />
            Reputation intelligence for deals and promises
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <DreddiLogoMark className="h-14 w-14 drop-shadow-[0_0_25px_rgba(52,211,153,0.35)]" />
              <div className="flex items-center gap-3 text-4xl font-semibold leading-tight sm:text-5xl">
                <span className="rounded-2xl bg-emerald-500/10 px-4 py-2 text-emerald-300">Dreddi</span>
                <span className="text-white">knows</span>
              </div>
            </div>
            <p className="max-w-xl text-lg text-slate-300">
              Track every promise, measure delivery, and keep your reputation sharp.
              Dreddi watches the details so your deals stay honest.
            </p>
            <div className="grid max-w-lg gap-2 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-200 ring-1 ring-white/10"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                    ✓
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {!ready ? (
            <div className="flex items-center gap-3 text-slate-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Loading your session…
            </div>
          ) : !email ? (
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-emerald-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
              >
                Get started
              </Link>
              <Link
                href="/p"
                className="rounded-xl border border-white/15 px-6 py-3 text-base font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
              >
                See public profiles
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link
                href="/promises/new"
                className="rounded-xl bg-emerald-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-2px] hover:shadow-emerald-400/50"
              >
                Create promise
              </Link>
              <Link
                href="/promises"
                className="rounded-xl border border-white/15 px-6 py-3 text-base font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
              >
                Review deals
              </Link>
              <button
                onClick={logout}
                className="rounded-xl px-6 py-3 text-base font-medium text-slate-300 transition hover:text-emerald-200"
              >
                Log out
              </button>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="glass-panel relative overflow-hidden rounded-3xl border-white/10 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-white/10 to-sky-400/5" aria-hidden />
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DreddiLogoMark className="h-12 w-12 drop-shadow-[0_10px_30px_rgba(16,185,129,0.35)]" />
                  <div>
                    <p className="text-sm text-slate-300">Reputation Score</p>
                    <p className="text-2xl font-semibold text-white">84</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-emerald-200 ring-1 ring-white/10">
                  Live
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200 shadow-inner shadow-black/30">
                  <div className="text-xs text-slate-400">Score</div>
                  <div className="text-2xl font-semibold text-white">84</div>
                </div>
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 shadow-inner shadow-black/30">
                  <div className="text-xs text-emerald-200">Promises</div>
                  <div className="text-lg font-semibold">+2 complete</div>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50 shadow-inner shadow-black/30">
                  <div className="text-xs text-amber-200">Alerts</div>
                  <div className="text-lg font-semibold">1 pending</div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-inner shadow-black/50">
                <div className="flex items-center gap-2 text-sm text-emerald-200">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  Reputation pending…
                </div>
                <p className="mt-2 text-lg font-semibold text-white">
                  Dreddi Alert
                </p>
                <p className="text-sm text-slate-300">Review pending • Action needed</p>
                <button className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50">
                  View deal
                </button>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Recent deals</span>
                  <Link
                    href="/promises"
                    className="text-xs font-medium text-emerald-200 hover:text-emerald-100"
                  >
                    See all
                  </Link>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  {showcasePromises.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 px-3 py-2 text-slate-200"
                    >
                      <div>
                        <div className="font-semibold text-white">{item.title}</div>
                        <div className="text-xs text-slate-400">{item.meta}</div>
                      </div>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-emerald-200">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

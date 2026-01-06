"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";
import { PromiseRole, isAwaitingOthers, isAwaitingYourAction } from "@/lib/promiseActions";

type PromiseRow = {
  id: string;
  title: string;
  status: PromiseStatus;
  due_at: string | null;
  created_at: string;
  completed_at: string | null;
  counterparty_id: string | null;
  creator_id: string; // ✅ was optional; selected in query, so make it required for correct role typing
};

type TabKey = "i-promised" | "promised-to-me";
type PromiseWithRole = PromiseRow & { role: PromiseRole; counterpartyAccepted: boolean };

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

const statusLabelForRole = (status: PromiseStatus, role: PromiseRole) => {
  if (role === "promisor") {
    if (status === "active") return "Active";
    if (status === "completed_by_promisor") return "Pending confirmation";
    if (status === "confirmed") return "Confirmed";
    if (status === "disputed") return "Disputed";
    if (status === "canceled") return "Canceled";
  }

  if (status === "active") return "Pending completion";
  if (status === "completed_by_promisor") return "Needs your review";
  if (status === "confirmed") return "Confirmed";
  if (status === "disputed") return "Disputed";
  if (status === "canceled") return "Canceled";

  return status;
};

export default function PromisesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab: TabKey = (searchParams.get("tab") as TabKey) ?? "i-promised";

  const [allRows, setAllRows] = useState<PromiseWithRole[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});

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
        .select("id,title,status,due_at,created_at,completed_at,counterparty_id,creator_id")
        .or(`creator_id.eq.${user.id},counterparty_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) setError(error.message);
      else {
        // ✅ Explicitly type the result as PromiseWithRole[] so role can't widen to string
        const filtered: PromiseWithRole[] = (data ?? [])
          .filter((row) => isPromiseStatus((row as { status?: unknown }).status))
          .map((row) => {
            const r = row as PromiseRow; // supabase returns loosely typed rows; we narrow to our shape
            const role: PromiseRole = r.creator_id === user.id ? "promisor" : "counterparty";
            return {
              ...r,
              status: r.status as PromiseStatus,
              role,
              counterpartyAccepted: Boolean(r.counterparty_id),
            };
          })
          .filter((row) => row.status !== "canceled");

        setAllRows(filtered);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setTab = (next: TabKey) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", next);
    router.push(`/promises?${sp.toString()}`);
  };

  const rows = useMemo(
    () =>
      allRows.filter((row) =>
        tab === "i-promised" ? row.role === "promisor" : row.role === "counterparty"
      ),
    [allRows, tab]
  );

  const overview = useMemo(() => {
    const total = allRows.length;
    const awaitingYou = allRows.filter((row) => isAwaitingYourAction(row)).length;
    const awaitingOthers = allRows.filter((row) => isAwaitingOthers(row)).length;

    return { total, awaitingYou, awaitingOthers };
  }, [allRows]);

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
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Your promises overview</h1>
              <p className="text-sm text-slate-300">Snapshot of everything you promised and what was promised to you.</p>
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
              <div className="mt-1 text-2xl font-semibold text-white">{overview.total}</div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-emerald-100 shadow-inner shadow-black/30">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">Awaiting your action</div>
              <div className="mt-1 text-lg font-semibold">{overview.awaitingYou}</div>
            </div>
            <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-amber-50 shadow-inner shadow-black/30">
              <div className="text-xs uppercase tracking-[0.2em] text-amber-200">Awaiting others</div>
              <div className="mt-1 text-lg font-semibold">{overview.awaitingOthers}</div>
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
                  <div key={i} className="h-[102px] animate-pulse rounded-2xl bg-white/5" />
                ))}
              </div>
            )}

            {!loading &&
              rows.map((p) => {
                const isPromisor = p.role === "promisor";
                const waiting = p.status === "completed_by_promisor";
                const impact = (() => {
                  if (!isPromisor) return null;

                  if (p.status === "confirmed") {
                    const onTime = Boolean(
                      p.due_at &&
                        p.completed_at &&
                        new Date(p.completed_at).getTime() <= new Date(p.due_at).getTime()
                    );
                    return `+${onTime ? 4 : 3}`;
                  }

                  if (p.status === "disputed") {
                    const late = Boolean(
                      p.due_at &&
                        p.completed_at &&
                        new Date(p.completed_at).getTime() > new Date(p.due_at).getTime()
                    );
                    return late ? "-7" : "-6";
                  }

                  return null;
                })();

                const actionLabel = isPromisor
                  ? p.status === "completed_by_promisor"
                    ? "Waiting for confirmation"
                    : null
                  : waiting
                  ? "Action required"
                  : null;

                const statusLabel = statusLabelForRole(p.status, p.role);

                const busy = busyMap[p.id];

                return (
                  <div
                    key={p.id}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-300/40 hover:bg-emerald-500/5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-sm uppercase tracking-[0.18em] text-emerald-200">Promise</div>
                        <Link
                          href={`/promises/${p.id}`}
                          className="text-lg font-semibold text-white transition hover:text-emerald-100"
                        >
                          {p.title}
                        </Link>
                        <div className="text-sm text-slate-300">Due: {formatDue(p.due_at)}</div>
                        {waiting && (
                          <p className="text-xs text-amber-200">
                            {isPromisor
                              ? "You marked this complete. Waiting for the counterparty."
                              : "Promisor marked this complete. Please confirm or dispute."}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 text-right text-sm text-slate-200">
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                          {statusLabel}
                        </span>
                        {actionLabel && <span className="text-xs text-amber-200">{actionLabel}</span>}

                        {impact && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                            Score impact: {impact}
                          </span>
                        )}

                        {isPromisor && p.status === "active" && p.counterpartyAccepted && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              setBusyMap((m) => ({ ...m, [p.id]: true }));
                              setError(null);
                              try {
                                const { data } = await supabase.auth.getSession();
                                if (!data.session) {
                                  router.push(`/login?next=${encodeURIComponent("/promises")}`);
                                  return;
                                }

                                const res = await fetch(`/api/promises/${p.id}/complete`, {
                                  method: "POST",
                                  headers: {
                                    Authorization: `Bearer ${data.session.access_token}`,
                                  },
                                });

                                if (!res.ok) {
                                  const body = await res.json().catch(() => ({}));
                                  throw new Error(body.error ?? "Could not mark complete");
                                }

                                setAllRows((prev) =>
                                  prev.map((row) =>
                                    row.id === p.id
                                      ? { ...row, status: "completed_by_promisor" as PromiseStatus }
                                      : row
                                  )
                                );
                              } catch (e) {
                                setError(e instanceof Error ? e.message : "Failed to update");
                              } finally {
                                setBusyMap((m) => ({ ...m, [p.id]: false }));
                              }
                            }}
                            className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 disabled:opacity-60"
                          >
                            {busy ? "Updating…" : "Request confirmation"}
                          </button>
                        )}

                        {isPromisor && p.status === "active" && !p.counterpartyAccepted && (
                          <p className="text-xs text-slate-400">
                            Send the invite and wait for acceptance to request confirmation.
                          </p>
                        )}

                        {!isPromisor && p.status === "completed_by_promisor" && (
                          <Link
                            href={`/promises/${p.id}/confirm`}
                            className="inline-flex items-center justify-center rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-50 shadow-lg shadow-amber-900/30 transition hover:bg-amber-500/20"
                          >
                            Review & confirm
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

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

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type PromiseRow = {
  id: string;
  title: string;
  details: string | null;
  due_at: string | null;
  status: string;
  creator_id: string;
  creator_display_name: string | null;
  counterparty_id: string | null;
  disputed_code: string | null;
  dispute_reason: string | null;
};

const DISPUTE_OPTIONS = [
  { code: "not_completed", label: "It wasn’t completed" },
  { code: "partial", label: "Partially completed" },
  { code: "late", label: "Completed late" },
  { code: "other", label: "Other" },
] as const;

function formatDate(value: string | null) {
  if (!value) return "No deadline";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ConfirmPromisePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [promise, setPromise] = useState<PromiseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<"confirm" | "dispute" | null>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeCode, setDisputeCode] = useState<(typeof DISPUTE_OPTIONS)[number]["code"]>(
    DISPUTE_OPTIONS[0].code
  );
  const [disputeReason, setDisputeReason] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!params?.id) return;
      setLoading(true);
      setError(null);

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push(`/login?next=${encodeURIComponent(`/promises/${params.id}/confirm`)}`);
        return;
      }

      const res = await fetch(`/api/promises/${params.id}`, {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      if (!mounted) return;

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to load promise");
        setLoading(false);
        return;
      }

      const body = await res.json();
      setPromise(body as PromiseRow);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [params?.id, router]);

  function statusNote(status: string) {
    if (status === "confirmed") return "Already confirmed ✅";
    if (status === "disputed") return "Already disputed";
    if (status === "active") return "Not marked as completed yet";
    return null;
  }

  async function postAction(path: string, payload?: Record<string, unknown>) {
    if (!promise) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push(`/login?next=${encodeURIComponent(`/promises/${promise.id}/confirm`)}`);
      return;
    }

    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Action failed");
    }
  }

  async function onConfirm() {
    if (!promise) return;
    setActionBusy("confirm");
    setError(null);
    try {
      await postAction(`/api/promises/${promise.id}/confirm`);
      setSuccessMessage("Promise confirmed. Redirecting…");
      setTimeout(() => router.push("/promises"), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm");
    } finally {
      setActionBusy(null);
    }
  }

  async function onDispute() {
    if (!promise) return;
    setActionBusy("dispute");
    setError(null);
    try {
      await postAction(`/api/promises/${promise.id}/dispute`, {
        code: disputeCode,
        reason: disputeCode === "other" ? disputeReason : undefined,
      });
      setSuccessMessage("Dispute submitted. Redirecting…");
      setTimeout(() => router.push("/promises"), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to dispute");
    } finally {
      setActionBusy(null);
      setShowDispute(false);
    }
  }

  const disputeDisabled =
    disputeCode === "other" && disputeReason.trim().length < 4;

  const disputeLabel = useMemo(() => {
    const found = DISPUTE_OPTIONS.find((d) => d.code === promise?.disputed_code);
    return found?.label ?? promise?.disputed_code;
  }, [promise?.disputed_code]);

  return (
    <main className="relative min-h-screen py-12">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(74,222,128,0.08),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(74,144,226,0.08),transparent_28%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-6 px-6">
        <div className="flex items-center justify-between text-sm text-emerald-100/80">
          <Link href="/promises" className="hover:text-emerald-200">
            ← Back to promises
          </Link>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
            Review
          </span>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/50 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          {loading ? (
            <div className="space-y-3">
              <div className="h-6 w-1/3 animate-pulse rounded bg-white/10" />
              <div className="h-12 animate-pulse rounded-xl bg-white/5" />
              <div className="h-20 animate-pulse rounded-xl bg-white/5" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">{error}</div>
          ) : !promise ? (
            <div className="text-slate-200">Promise not found.</div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Promise</p>
                  <h1 className="text-3xl font-semibold text-white sm:text-4xl">{promise.title}</h1>
                  <p className="text-sm text-slate-300">Due: {formatDate(promise.due_at)}</p>
                  <p className="text-sm text-slate-400">
                    Created by {promise.creator_display_name ?? promise.creator_id.slice(0, 8)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 text-sm text-slate-200">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                    Status: {promise.status}
                  </span>
                  {promise.status === "completed_by_promisor" && (
                    <p className="text-xs text-amber-200">Action required from you</p>
                  )}
                </div>
              </div>

              {promise.details && (
                <div className="mt-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-slate-200">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Details</p>
                  <div className="mt-2 whitespace-pre-wrap">{promise.details}</div>
                </div>
              )}

              {promise.status === "disputed" && (
                <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-50">
                  <p className="font-semibold">Already disputed</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-amber-200">Reason</p>
                  <p className="mt-1">{disputeLabel}</p>
                  {promise.dispute_reason && (
                    <p className="mt-1 text-amber-100/80">{promise.dispute_reason}</p>
                  )}
                </div>
              )}

              {successMessage && (
                <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                  {successMessage}
                </div>
              )}

              {promise.status === "completed_by_promisor" ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={actionBusy !== null}
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 disabled:opacity-60"
                  >
                    {actionBusy === "confirm" ? "Confirming…" : "Confirm completion"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDispute(true)}
                    disabled={actionBusy !== null}
                    className="inline-flex items-center justify-center rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 shadow-lg shadow-red-900/30 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    {actionBusy === "dispute" ? "Sending…" : "Dispute"}
                  </button>
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  {statusNote(promise.status) ?? "No actions available."}
                </div>
              )}
            </>
          )}
        </div>

        {showDispute && promise && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 px-4 py-8">
            <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-950/95 p-6 shadow-2xl shadow-black/50">
              <button
                type="button"
                onClick={() => setShowDispute(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Dispute</p>
                <h2 className="text-xl font-semibold text-white">Tell us what went wrong</h2>
                <p className="text-sm text-slate-300">Choose the issue and provide optional context.</p>
              </div>

              <div className="mt-4 space-y-3">
                {DISPUTE_OPTIONS.map((opt) => (
                  <label
                    key={opt.code}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:border-emerald-300/30"
                  >
                    <input
                      type="radio"
                      name="dispute"
                      value={opt.code}
                      checked={disputeCode === opt.code}
                      onChange={() => setDisputeCode(opt.code)}
                      className="h-4 w-4 accent-emerald-400"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              {disputeCode === "other" && (
                <div className="mt-4">
                  <label className="text-xs uppercase tracking-[0.14em] text-slate-400">Reason</label>
                  <textarea
                    rows={3}
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                    placeholder="Add context"
                  />
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onDispute}
                  disabled={actionBusy !== null || disputeDisabled}
                  className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:translate-y-[-1px] hover:shadow-amber-400/40 disabled:opacity-60"
                >
                  {actionBusy === "dispute" ? "Submitting…" : "Submit dispute"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDispute(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

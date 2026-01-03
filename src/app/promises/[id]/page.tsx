"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type PromiseRow = {
  id: string;
  title: string;
  details: string | null;
  counterparty_contact: string | null;
  due_at: string | null;
  status: "active" | "fulfilled" | "broken";
  created_at: string;
  invite_token: string | null;
  creator_id: string;
  counterparty_id: string | null;
};

function StatusPill({ status }: { status: PromiseRow["status"] }) {
  const label =
    status === "active" ? "Active" : status === "fulfilled" ? "Fulfilled" : "Broken";
  const cls =
    status === "active"
      ? "border-neutral-700 text-neutral-200"
      : status === "fulfilled"
      ? "border-emerald-700 text-emerald-300"
      : "border-red-700 text-red-300";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${cls}`}>
      {label}
    </span>
  );
}

function formatDue(dueAt: string | null) {
  if (!dueAt) return "No deadline";
  const d = new Date(dueAt);
  return `Due: ${d.toLocaleString()}`;
}

export default function PromisePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [p, setP] = useState<PromiseRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const dueText = useMemo(() => (p ? formatDue(p.due_at) : ""), [p]);

  const isCreator = useMemo(() => {
    if (!p || !userId) return false;
    return p.creator_id === userId;
  }, [p, userId]);

  const inviteUrl = useMemo(() => {
    if (!p?.invite_token) return null;
    return `${window.location.origin}/p/invite/${p.invite_token}`;
  }, [p?.invite_token]);

  async function load() {
    if (!id) return;
    setError(null);

    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      router.push(`/login?next=${encodeURIComponent(`/promises/${id}`)}`);
      return;
    }
    setUserId(s.session.user.id);

    const { data, error } = await supabase
      .from("promises")
      .select(
        "id,title,details,counterparty_contact,due_at,status,created_at,invite_token,creator_id,counterparty_id"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setP(null);
      return;
    }
    if (!data) {
      setError("Promise not found or you don’t have access.");
      setP(null);
      return;
    }

    setP(data as PromiseRow);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setStatus(status: PromiseRow["status"]) {
    if (!p) return;
    setBusy(true);
    setError(null);

    const { error } = await supabase.from("promises").update({ status }).eq("id", p.id);

    setBusy(false);
    if (error) setError(error.message);
    else load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      // fallback
      window.prompt("Copy invite link:", inviteUrl);
    }
  }

  async function regenerateInvite() {
    if (!p) return;
    if (!isCreator) return;

    setBusy(true);
    setError(null);

    const token =
      crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const { error } = await supabase
      .from("promises")
      .update({ invite_token: token })
      .eq("id", p.id);

    setBusy(false);

    if (error) setError(error.message);
    else load();
  }

  if (!id) {
    return <div className="mx-auto max-w-3xl px-6 py-10 text-neutral-400">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/promises" className="text-neutral-400 hover:text-white">
          ← Back
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/promises" className="text-sm text-neutral-300 hover:text-white">
            My promises
          </Link>
          <button onClick={logout} className="text-sm text-neutral-400 hover:text-white">
            Log out
          </button>
          {p && <StatusPill status={p.status} />}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-red-300">
          {error}
        </div>
      )}

      {!p ? (
        !error && <div className="text-neutral-400">Loading promise…</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h1 className="text-2xl font-semibold leading-snug">{p.title}</h1>

            <div className="mt-2 text-sm text-neutral-400">{dueText}</div>

            {p.counterparty_contact && (
              <div className="mt-2 text-sm text-neutral-400">
                Counterparty:{" "}
                <span className="text-neutral-200">{p.counterparty_contact}</span>
              </div>
            )}

            <div className="mt-2 text-sm text-neutral-400">
              Accepted by second side:{" "}
              {p.counterparty_id ? (
                <span className="text-emerald-300">Yes</span>
              ) : (
                <span className="text-neutral-300">No</span>
              )}
            </div>

            {p.details && (
              <div className="mt-4 text-neutral-200 whitespace-pre-wrap">{p.details}</div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy || !isCreator}
              onClick={() => setStatus("fulfilled")}
              className="rounded-xl bg-white text-neutral-950 font-medium px-4 py-2 disabled:opacity-60"
              title={!isCreator ? "Only creator can change status (for now)" : ""}
            >
              Mark fulfilled
            </button>

            <button
              disabled={busy || !isCreator}
              onClick={() => setStatus("broken")}
              className="rounded-xl border border-neutral-800 bg-transparent text-white font-medium px-4 py-2 disabled:opacity-60"
              title={!isCreator ? "Only creator can change status (for now)" : ""}
            >
              Mark broken
            </button>

            <button
              disabled={busy || !isCreator}
              onClick={() => setStatus("active")}
              className="rounded-xl border border-neutral-800 bg-transparent text-neutral-300 font-medium px-4 py-2 disabled:opacity-60"
              title={!isCreator ? "Only creator can change status (for now)" : ""}
            >
              Back to active
            </button>
          </div>

          {/* INVITE BLOCK (creator only) */}
          {isCreator && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-3">
              <div className="text-sm font-medium text-neutral-200">Invite link</div>

              {inviteUrl ? (
                <>
                  <div className="text-sm text-neutral-300 break-all">{inviteUrl}</div>

                  <div className="flex gap-3">
                    <button
                      disabled={busy}
                      onClick={copyInvite}
                      className="rounded-xl bg-white text-neutral-950 font-medium px-4 py-2 disabled:opacity-60"
                    >
                      Copy link
                    </button>
                    <button
                      disabled={busy}
                      onClick={regenerateInvite}
                      className="rounded-xl border border-neutral-800 bg-transparent text-white font-medium px-4 py-2 disabled:opacity-60"
                    >
                      Regenerate
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-neutral-400">
                  No invite token yet. Press “Regenerate” to create one.
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-neutral-500">
            Next step: confirmations / actions by the second side + timeline.
          </div>
        </div>
      )}
    </div>
  );
}

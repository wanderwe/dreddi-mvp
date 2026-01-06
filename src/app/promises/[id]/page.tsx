"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PromiseStatus, isPromiseStatus } from "@/lib/promiseStatus";

type PromiseRow = {
  id: string;
  title: string;
  details: string | null;
  counterparty_contact: string | null;
  due_at: string | null;
  status: PromiseStatus;
  created_at: string;

  invite_token: string | null;
  counterparty_id: string | null;
  creator_id: string;
};

function formatDue(dueAt: string | null) {
  if (!dueAt) return "No deadline";
  try {
    return new Date(dueAt).toLocaleString();
  } catch {
    return "No deadline";
  }
}

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold text-neutral-200">{title}</div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatusPill({ status }: { status: PromiseRow["status"] }) {
  const labelMap: Record<PromiseRow["status"], string> = {
    active: "Active",
    completed_by_promisor: "Waiting confirmation",
    confirmed: "Confirmed",
    disputed: "Disputed",
  };

  const colorMap: Record<PromiseRow["status"], string> = {
    active: "border-neutral-700 text-neutral-200 bg-white/0",
    confirmed: "border-emerald-700/60 text-emerald-200 bg-emerald-500/10",
    disputed: "border-red-700/60 text-red-200 bg-red-500/10",
    completed_by_promisor: "border-amber-500/40 text-amber-100 bg-amber-500/10",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${colorMap[status] ?? "border-neutral-700 bg-white/0 text-white"}`}
    >
      {labelMap[status] ?? status}
    </span>
  );
}

function ActionButton({
  label,
  variant,
  active,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  variant: "primary" | "ghost" | "ok" | "danger";
  active?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium " +
    "transition select-none focus:outline-none focus:ring-2 focus:ring-white/15 " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  const ghost =
    "border-neutral-800 bg-transparent text-neutral-200 hover:bg-white/5 hover:border-neutral-700";

  const primary =
    "border-white/10 bg-white text-neutral-950 hover:bg-white/90 hover:border-white/20";

  // мягкая активная подсветка (не “белая заливка на весь экран”)
  const activeNeutral =
    "border-white/20 bg-white/10 text-white hover:bg-white/14 hover:border-white/25";
  const activeOk =
    "border-emerald-500/35 bg-emerald-500/12 text-emerald-100 hover:bg-emerald-500/16";
  const activeDanger =
    "border-red-500/35 bg-red-500/12 text-red-100 hover:bg-red-500/16";

  const toneOk =
    "border-emerald-500/20 bg-transparent text-emerald-200 hover:bg-emerald-500/10 hover:border-emerald-500/30";
  const toneDanger =
    "border-red-500/20 bg-transparent text-red-200 hover:bg-red-500/10 hover:border-red-500/30";

  let cls = base;

  if (variant === "primary") cls += " " + primary;
  else if (variant === "ghost") cls += " " + ghost;
  else if (variant === "ok") cls += " " + (active ? activeOk : toneOk);
  else if (variant === "danger") cls += " " + (active ? activeDanger : toneDanger);

  // “active” только для нейтрального (Active status) + для ok/danger уже учтено
  if (active && (variant === "ghost" || variant === "primary")) {
    cls += " " + activeNeutral;
  }

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cls}>
      {loading ? "Saving…" : label}
    </button>
  );
}

export default function PromisePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [p, setP] = useState<PromiseRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // отдельные "busy" чтобы не ломать UX всего экрана
  const [actionBusy, setActionBusy] = useState<"complete" | "confirm" | "dispute" | null>(null);
  const [inviteBusy, setInviteBusy] = useState<"generate" | "regen" | "copy" | null>(null);

  const dueText = useMemo(() => (p ? formatDue(p.due_at) : ""), [p]);

  async function requireSessionOrRedirect(nextPath: string) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return null;
    }
    setUserId(data.session.user.id);
    return data.session;
  }

  async function load() {
    if (!id) return;

    setError(null);

    const session = await requireSessionOrRedirect(`/promises/${id}`);
    if (!session) return;

    const { data, error } = await supabase
      .from("promises")
      .select(
        "id,title,details,counterparty_contact,due_at,status,created_at,invite_token,counterparty_id,creator_id"
      )
      .eq("id", id)
      .single();

    if (error) setError(error.message);
    else {
      const status = (data as { status?: unknown }).status;
      if (!isPromiseStatus(status)) {
        setError("Promise has an unsupported status value");
        setP({ ...(data as PromiseRow), status: "active" });
      } else {
        setP({ ...(data as PromiseRow), status });
      }
    }
  }

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function markCompleted() {
    if (!p) return;
    setError(null);
    setActionBusy("complete");

    const session = await requireSessionOrRedirect(`/promises/${id}`);
    if (!session) {
      setActionBusy(null);
      return;
    }

    const res = await fetch(`/api/promises/${p.id}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    setActionBusy(null);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? "Could not update status");
      return;
    }

    load();
  }

  async function generateInvite(regenerate = false) {
    if (!p) return;

    const isInviteAccepted = Boolean(p.counterparty_id);
    const isFinal = p.status === "confirmed" || p.status === "disputed";

    if (!isPromisor || isInviteAccepted || isFinal) return;

    setError(null);
    setInviteBusy(regenerate ? "regen" : "generate");

    const session = await requireSessionOrRedirect(`/promises/${id}`);
    if (!session) {
      setInviteBusy(null);
      return;
    }

    const token = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const patch: Partial<PromiseRow> = regenerate
      ? { invite_token: token }
      : p.invite_token
      ? {}
      : { invite_token: token };

    if (!Object.keys(patch).length) {
      setInviteBusy(null);
      return;
    }

    const { error } = await supabase.from("promises").update(patch).eq("id", p.id);

    setInviteBusy(null);

    if (error) setError(error.message);
    else load();
  }

  const inviteLink = useMemo(() => {
    if (!p?.invite_token) return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/p/invite/${p.invite_token}`;
  }, [p?.invite_token]);

  async function copyInvite() {
    if (!inviteLink || !canManageInvite || isInviteAccepted || isFinal) return;
    setError(null);
    setInviteBusy("copy");

    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      setError("Could not copy to clipboard.");
    } finally {
      setInviteBusy(null);
    }
  }

  const isPromisor = Boolean(p && userId === p.creator_id);
  const isCounterparty = Boolean(p && userId === p.counterparty_id);
  const waitingForReview = p?.status === "completed_by_promisor";
  const isInviteAccepted = Boolean(p?.counterparty_id);
  const isFinal = Boolean(p && (p.status === "confirmed" || p.status === "disputed"));
  const canManageInvite = Boolean(p && isPromisor);

  return (
    <div className="mx-auto w-full max-w-3xl py-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/promises" className="text-neutral-400 hover:text-white">
          ← Back
        </Link>

        <div className="flex items-center gap-3">{p && <StatusPill status={p.status} />}</div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-red-300">
          {error}
        </div>
      )}

      {!p ? (
        <div className="text-neutral-400">Loading…</div>
      ) : (
        <>
          <Card title="Promise">
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-semibold text-white">{p.title}</div>
                <div className="mt-2 text-sm text-neutral-400">{dueText}</div>
              </div>

              <div className="text-sm text-neutral-400">
                Accepted by second side:{" "}
                <span
                  className={
                    "text-sm font-medium " +
                    (p.counterparty_id ? "text-emerald-300" : "text-neutral-200")
                  }
                >
                  {p.counterparty_id ? "Yes" : "No"}
                </span>
              </div>

              {p.counterparty_contact && (
                <div className="text-sm text-neutral-400">
                  Counterparty: <span className="text-neutral-200">{p.counterparty_contact}</span>
                </div>
              )}

              {p.details ? (
                <div className="pt-2 text-neutral-200 whitespace-pre-wrap">{p.details}</div>
              ) : (
                <div className="pt-2 text-neutral-500">без деталей</div>
              )}
            </div>
          </Card>

          <Card title="Status actions">
            <div className="space-y-3">
              <div className="text-sm text-neutral-300">Current status: <StatusPill status={p.status} /></div>

              {isPromisor && p.status === "active" && (
                <ActionButton
                  label="Mark as completed"
                  variant="ok"
                  loading={actionBusy === "complete"}
                  disabled={actionBusy !== null}
                  onClick={markCompleted}
                />
              )}

              {isCounterparty && p.status === "completed_by_promisor" && (
                <Link
                  href={`/promises/${p.id}/confirm`}
                  className="inline-flex items-center justify-center rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-50 shadow-lg shadow-amber-900/30 transition hover:bg-amber-500/20"
                >
                  Review & confirm
                </Link>
              )}

              {waitingForReview && !isCounterparty && (
                <div className="text-sm text-neutral-400">Waiting for the counterparty to review.</div>
              )}

              {p.status === "confirmed" && (
                <div className="text-sm text-emerald-300">Promise confirmed ✅</div>
              )}

              {p.status === "disputed" && (
                <div className="text-sm text-red-300">Promise disputed.</div>
              )}

              {!isPromisor && !isCounterparty && (
                <div className="text-xs text-neutral-500">You are viewing this promise as a guest.</div>
              )}
            </div>
          </Card>

          {!isFinal && canManageInvite && (
            <Card title={isInviteAccepted ? "Invite" : "Invite link"}>
              {isInviteAccepted ? (
                <div className="flex flex-col gap-2 text-sm text-neutral-300">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-100">
                    Invite accepted
                  </div>
                  <div className="text-neutral-300">
                    Invite accepted by {p.counterparty_contact ?? "counterparty"}.
                  </div>
                </div>
              ) : !p.invite_token ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-neutral-400">
                    No invite token yet. Press “Generate” to create one.
                  </div>

                  <ActionButton
                    label="Generate"
                    variant="primary"
                    loading={inviteBusy === "generate"}
                    disabled={inviteBusy !== null}
                    onClick={() => generateInvite(false)}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-neutral-800 bg-black/30 px-4 py-3 text-sm text-neutral-200 break-all">
                    {inviteLink ?? "…"}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <ActionButton
                      label="Copy link"
                      variant="primary"
                      loading={inviteBusy === "copy"}
                      disabled={inviteBusy !== null || !inviteLink}
                      onClick={copyInvite}
                    />

                    <ActionButton
                      label="Regenerate"
                      variant="ghost"
                      loading={inviteBusy === "regen"}
                      disabled={inviteBusy !== null}
                      onClick={() => generateInvite(true)}
                    />

                    {inviteLink && (
                      <Link
                        href={`/p/invite/${p.invite_token}`}
                        className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-transparent text-neutral-200 px-4 py-2 text-sm font-medium transition hover:bg-white/5 hover:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-white/15"
                      >
                        Open invite page
                      </Link>
                    )}
                  </div>

                  <div className="text-xs text-neutral-500">
                    Tip: open the invite in Incognito to test another user. Regenerating invalidates the
                    old link.
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

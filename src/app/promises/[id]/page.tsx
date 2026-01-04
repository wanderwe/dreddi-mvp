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
  const label =
    status === "active" ? "Active" : status === "fulfilled" ? "Fulfilled" : "Broken";

  const cls =
    status === "active"
      ? "border-neutral-700 text-neutral-200 bg-white/0"
      : status === "fulfilled"
      ? "border-emerald-700/60 text-emerald-200 bg-emerald-500/10"
      : "border-red-700/60 text-red-200 bg-red-500/10";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${cls}`}>
      {label}
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
  const [error, setError] = useState<string | null>(null);

  // отдельные "busy" чтобы не ломать UX всего экрана
  const [statusBusy, setStatusBusy] = useState<PromiseRow["status"] | null>(null);
  const [inviteBusy, setInviteBusy] = useState<"generate" | "regen" | "copy" | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const dueText = useMemo(() => (p ? formatDue(p.due_at) : ""), [p]);

  async function requireSessionOrRedirect(nextPath: string) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return null;
    }
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
    else setP(data as PromiseRow);
  }

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setStatus(next: PromiseRow["status"]) {
    if (!p) return;
    if (p.status === next) return;

    setError(null);
    setStatusBusy(next);

    // optimistic UI: сразу подсветим выбранное
    const prev = p;
    setP({ ...p, status: next });

    const session = await requireSessionOrRedirect(`/promises/${id}`);
    if (!session) {
      setStatusBusy(null);
      setP(prev);
      return;
    }

    const { error } = await supabase.from("promises").update({ status: next }).eq("id", p.id);

    setStatusBusy(null);

    if (error) {
      setError(error.message);
      // rollback на реальное значение
      setP(prev);
      return;
    }

    // подхватим актуальные данные (на случай триггеров/правил)
    load();
  }

  async function generateInvite(regenerate = false) {
    if (!p) return;

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
    if (!inviteLink) return;
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

  async function logout() {
    setLogoutBusy(true);
    await supabase.auth.signOut();
    setLogoutBusy(false);
    router.push("/login");
  }

  const anyStatusBusy = statusBusy !== null;

  return (
    <div className="mx-auto w-full max-w-3xl py-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/promises" className="text-neutral-400 hover:text-white">
          ← Back
        </Link>

        <div className="flex items-center gap-3">
          {p && <StatusPill status={p.status} />}

          <button
            onClick={logout}
            disabled={logoutBusy}
            className="text-sm text-neutral-400 hover:text-white disabled:opacity-60"
          >
            {logoutBusy ? "…" : "Log out"}
          </button>
        </div>
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

          <Card title="Status actions" right={<div className="text-xs text-neutral-500">Click to set</div>}>
            <div className="flex flex-wrap gap-3">
              <ActionButton
                label="Active"
                variant="ghost"
                active={p.status === "active"}
                loading={statusBusy === "active"}
                disabled={anyStatusBusy}
                onClick={() => setStatus("active")}
              />
              <ActionButton
                label="Fulfilled"
                variant="ok"
                active={p.status === "fulfilled"}
                loading={statusBusy === "fulfilled"}
                disabled={anyStatusBusy}
                onClick={() => setStatus("fulfilled")}
              />
              <ActionButton
                label="Broken"
                variant="danger"
                active={p.status === "broken"}
                loading={statusBusy === "broken"}
                disabled={anyStatusBusy}
                onClick={() => setStatus("broken")}
              />
            </div>

            <div className="mt-3 text-xs text-neutral-500">
              Tip: hover shows intent; click updates status (with optimistic highlight).
            </div>
          </Card>

          <Card title="Invite link">
            {!p.invite_token ? (
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
                  Tip: open the invite in Incognito to test another user.
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

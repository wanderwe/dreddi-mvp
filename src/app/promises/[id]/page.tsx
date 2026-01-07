"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
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
  promisor_id: string | null;
  promisee_id: string | null;
};

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
  const t = useT();
  const labelMap: Record<PromiseRow["status"], string> = {
    active: t("promises.status.active"),
    completed_by_promisor: t("promises.status.pendingConfirmation"),
    confirmed: t("promises.status.confirmed"),
    disputed: t("promises.status.disputed"),
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

  const t = useT();

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cls}>
      {loading ? t("promises.detail.saving") : label}
    </button>
  );
}

export default function PromisePage() {
  const t = useT();
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [p, setP] = useState<PromiseRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // отдельные "busy" чтобы не ломать UX всего экрана
  const [actionBusy, setActionBusy] = useState<"complete" | "confirm" | "dispute" | null>(null);
  const [inviteBusy, setInviteBusy] = useState<"generate" | "regen" | "copy" | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const supabaseErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : "Authentication is unavailable in this preview.";

  const dueText = useMemo(() => {
    if (!p?.due_at) return t("promises.detail.noDeadline");
    try {
      return new Date(p.due_at).toLocaleString(locale);
    } catch {
      return t("promises.detail.noDeadline");
    }
  }, [locale, p, t]);

  async function requireSessionOrRedirect(
    nextPath: string,
    supabase: ReturnType<typeof requireSupabase>
  ) {
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

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setError(supabaseErrorMessage(err));
      return;
    }

    const session = await requireSessionOrRedirect(`/promises/${id}`, supabase);
    if (!session) return;

    const { data, error } = await supabase
      .from("promises")
      .select(
        "id,title,details,counterparty_contact,due_at,status,created_at,invite_token,counterparty_id,creator_id,promisor_id,promisee_id"
      )
      .eq("id", id)
      .single();

    if (error) setError(error.message);
    else {
      const status = (data as { status?: unknown }).status;
      if (!isPromiseStatus(status)) {
        setError(t("promises.detail.errors.unsupportedStatus"));
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

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setError(supabaseErrorMessage(err));
      setActionBusy(null);
      return;
    }

    const session = await requireSessionOrRedirect(`/promises/${id}`, supabase);
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
      setError(j?.error ?? t("promises.detail.errors.updateStatus"));
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

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setError(supabaseErrorMessage(err));
      setInviteBusy(null);
      return;
    }

    const session = await requireSessionOrRedirect(`/promises/${id}`, supabase);
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
      setError(t("promises.detail.errors.copyClipboard"));
    } finally {
      setInviteBusy(null);
    }
  }

  const isPromisor = Boolean(
    p &&
      ((p.promisor_id ? userId === p.promisor_id : false) ||
        (!p.promisee_id && userId === p.creator_id))
  );
  const isCounterparty = Boolean(
    p &&
      ((p.promisee_id ? userId === p.promisee_id : false) ||
        (!p.promisee_id && userId === p.counterparty_id))
  );
  const waitingForReview = p?.status === "completed_by_promisor";
  const isInviteAccepted = Boolean(p?.counterparty_id ?? (p?.promisor_id && p?.promisee_id));
  const isFinal = Boolean(p && (p.status === "confirmed" || p.status === "disputed"));
  const canManageInvite = Boolean(p && userId === p.creator_id);

  return (
    <div className="mx-auto w-full max-w-3xl py-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/promises" className="text-neutral-400 hover:text-white">
          ← {t("promises.detail.back")}
        </Link>

        <div className="flex items-center gap-3">{p && <StatusPill status={p.status} />}</div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-red-300">
          {error}
        </div>
      )}

      {!p ? (
        <div className="text-neutral-400">{t("promises.detail.loading")}</div>
      ) : (
        <>
          <Card title={t("promises.detail.cardTitle")}>
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-semibold text-white">{p.title}</div>
                <div className="mt-2 text-sm text-neutral-400">{dueText}</div>
              </div>

              <div className="text-sm text-neutral-400">
                {t("promises.detail.acceptedBySecondSide")}:{" "}
                <span
                  className={
                    "text-sm font-medium " +
                    (p.counterparty_id ? "text-emerald-300" : "text-neutral-200")
                  }
                >
                  {p.counterparty_id ? t("promises.detail.yes") : t("promises.detail.no")}
                </span>
              </div>

              {p.counterparty_contact && (
                <div className="text-sm text-neutral-400">
                  {t("promises.detail.counterparty")}:{" "}
                  <span className="text-neutral-200">{p.counterparty_contact}</span>
                </div>
              )}

              {p.details ? (
                <div className="pt-2 text-neutral-200 whitespace-pre-wrap">{p.details}</div>
              ) : (
                <div className="pt-2 text-neutral-500">{t("promises.detail.noDetails")}</div>
              )}
            </div>
          </Card>

          <Card title={t("promises.detail.statusActions")}>
            <div className="space-y-3">
              <div className="text-sm text-neutral-300">
                {t("promises.detail.currentStatus")}: <StatusPill status={p.status} />
              </div>

              {isPromisor && p.status === "active" && (
                isInviteAccepted ? (
                  <ActionButton
                    label={t("promises.detail.markCompleted")}
                    variant="ok"
                    loading={actionBusy === "complete"}
                    disabled={actionBusy !== null}
                    onClick={() => setShowConfirmModal(true)}
                  />
                ) : (
                  <div className="text-sm text-neutral-400">
                    {t("promises.detail.shareInvite")}
                  </div>
                )
              )}

              {isCounterparty && p.status === "completed_by_promisor" && (
                <Link
                  href={`/promises/${p.id}/confirm`}
                  className="inline-flex items-center justify-center rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-50 shadow-lg shadow-amber-900/30 transition hover:bg-amber-500/20"
                >
                  {t("promises.detail.reviewConfirm")}
                </Link>
              )}

              {waitingForReview && !isCounterparty && (
                <div className="text-sm text-neutral-400">
                  {t("promises.detail.waitingReview")}
                </div>
              )}

              {p.status === "confirmed" && (
                <div className="text-sm text-emerald-300">{t("promises.detail.confirmed")}</div>
              )}

              {p.status === "disputed" && (
                <div className="text-sm text-red-300">{t("promises.detail.disputed")}</div>
              )}

              {!isPromisor && !isCounterparty && (
                <div className="text-xs text-neutral-500">{t("promises.detail.guestView")}</div>
              )}
            </div>
          </Card>

          {!isFinal && canManageInvite && (
            <Card title={isInviteAccepted ? t("promises.detail.inviteTitle") : t("promises.detail.inviteLinkTitle")}>
              {isInviteAccepted ? (
                <div className="flex flex-col gap-2 text-sm text-neutral-300">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-100">
                    {t("promises.detail.inviteAccepted")}
                  </div>
                  <div className="text-neutral-300">
                    {t("promises.detail.inviteAcceptedBy", {
                      name: p.counterparty_contact ?? t("promises.detail.counterpartyFallback"),
                    })}
                  </div>
                </div>
              ) : !p.invite_token ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-neutral-400">
                    {t("promises.detail.noInviteToken")}
                  </div>

                  <ActionButton
                    label={t("promises.detail.generate")}
                    variant="primary"
                    loading={inviteBusy === "generate"}
                    disabled={inviteBusy !== null}
                    onClick={() => generateInvite(false)}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-neutral-800 bg-black/30 px-4 py-3 text-sm text-neutral-200 break-all">
                    {inviteLink ?? t("promises.detail.inviteFallback")}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <ActionButton
                      label={t("promises.detail.copyLink")}
                      variant="primary"
                      loading={inviteBusy === "copy"}
                      disabled={inviteBusy !== null || !inviteLink}
                      onClick={copyInvite}
                    />

                    <ActionButton
                      label={t("promises.detail.regenerate")}
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
                        {t("promises.detail.openInvite")}
                      </Link>
                    )}
                  </div>

                  <div className="text-xs text-neutral-500">
                    {t("promises.detail.inviteTip")}
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">
              {t("promises.confirmModal.title")}
            </h2>
            <p className="mt-3 text-sm text-neutral-200">
              {t("promises.confirmModal.body")}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t("promises.confirmModal.cancel")}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirmModal(false);
                  await markCompleted();
                }}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50"
              >
                {t("promises.confirmModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";

type InviteInfo = {
  id: string;
  title: string;
  details: string | null;
  due_at: string | null;
  creator_handle: string | null;
  creator_display_name: string | null;
  counterparty_id: string | null;
  counterparty_contact: string | null;
};

export default function InvitePage() {
  const t = useT();
  const locale = useLocale();
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const router = useRouter();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean>(false);

  async function load() {
    if (!token) return;

    setError(null);

    // просто перевіряємо чи є сесія (для UI)
    if (!supabase) {
      setSignedIn(false);
    } else {
      const { data: s } = await supabase.auth.getSession();
      setSignedIn(Boolean(s.session));
    }

    // Дістаємо дані інвайту через API (server-side safe)
    const res = await fetch(`/api/invite/${token}`, { cache: "no-store" });
    const j = await res.json();

    if (!res.ok) {
      setError(j?.error ?? t("invite.errors.notFound"));
      setInfo(null);
      return;
    }

    setInfo(j as InviteInfo);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function accept() {
    if (!token) return;

    setBusy(true);
    setError(null);

    if (!supabase) {
      setBusy(false);
      setError("Authentication is unavailable in this preview.");
      return;
    }

    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      // відправляємо на логін і повертаємо назад сюди
      router.push(`/login?next=${encodeURIComponent(`/p/invite/${token}`)}`);
      setBusy(false);
      return;
    }

    const accessToken = s.session.access_token;

    const res = await fetch(`/api/invite/${token}/accept`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const j = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(j?.error ?? t("invite.errors.acceptFailed"));
      return;
    }

    // успіх: перезавантажимо дані і перекинемо на promises
    await load();
    router.push("/promises");
  }

  const creatorName = useMemo(() => {
    if (!info) return t("invite.unknown");
    return info.creator_handle
      ? `@${info.creator_handle}`
      : info.creator_display_name ?? t("invite.unknown");
  }, [info, t]);

  const formatDue = (dueAt: string | null) => {
    if (!dueAt) return t("invite.noDeadline");
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dueAt));
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 25%, rgba(52, 211, 153, 0.12), transparent 32%)," +
            "radial-gradient(circle at 80% 10%, rgba(99, 102, 241, 0.12), transparent 28%)," +
            "radial-gradient(circle at 50% 70%, rgba(248, 113, 113, 0.08), transparent 35%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-emerald-300/60 hover:bg-emerald-500/10"
          >
            <span aria-hidden>←</span>
            {t("invite.back")}
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            {signedIn ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden /> {t("invite.signedIn")}
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-300" aria-hidden /> {t("invite.guestMode")}
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">{t("invite.eyebrow")}</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            {t("invite.title")}
          </h1>
          <p className="max-w-2xl text-base text-slate-200">
            {t("invite.subtitle")}
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100 shadow-inner shadow-black/30">
            {error}
          </div>
        )}

        {!info && !error && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        )}

        {info && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            {info.counterparty_id && (
              <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {info.counterparty_contact
                  ? t("invite.acceptedBy", { name: info.counterparty_contact })
                  : t("invite.accepted")}
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  {t("invite.badge")}
                </div>

                {/* What exactly you accept */}
                <h2 className="text-2xl font-semibold text-white sm:text-3xl">{info.title}</h2>

                {info.details && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                    {info.details}
                  </p>
                )}

                <p className="text-sm text-slate-300">
                  {t("invite.createdBy", { name: creatorName })}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-left text-sm text-slate-200 shadow-inner shadow-black/40">
                <div className="rounded-full bg-white/10 p-2 text-emerald-300" aria-hidden>
                  ⏰
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{t("invite.deadline")}</p>
                  <p className="font-semibold text-white">{formatDue(info.due_at)}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-inner shadow-black/40">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{t("invite.statusLabel")}</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {info.counterparty_id ? t("invite.statusAccepted") : t("invite.statusAwaiting")}
                </p>
                <p className="text-sm text-slate-300">
                  {info.counterparty_id
                    ? t("invite.statusAcceptedBody")
                    : t("invite.statusAwaitingBody")}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-inner shadow-black/40">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{t("invite.nextStep")}</p>

                {info.counterparty_id ? (
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-100">
                    <span aria-hidden>✅</span> {t("invite.statusAccepted")}
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-xs text-slate-400">
                      {t("invite.nextStepHint")}
                    </p>
                    <button
                      disabled={busy}
                      onClick={accept}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/40 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
                    >
                      {busy ? t("invite.processing") : t("invite.accept")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

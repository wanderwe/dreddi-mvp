"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { requireSupabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n/I18nProvider";

export default function NewPromisePage() {
  const t = useT();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [executor, setExecutor] = useState<"me" | "other">("me");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabaseErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : "Authentication is unavailable in this preview.";

  useEffect(() => {
    let active = true;

    const ensureSession = async () => {
      let supabase;
      try {
        supabase = requireSupabase();
      } catch (err) {
        if (active) {
          setError(supabaseErrorMessage(err));
        }
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      if (!sessionData.session) {
        router.replace(`/login?next=${encodeURIComponent("/promises/new")}`);
      }
    };

    void ensureSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function createPromise() {
    setBusy(true);
    setError(null);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setBusy(false);
      setError(supabaseErrorMessage(err));
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session) {
      setBusy(false);
      router.push(`/login?next=${encodeURIComponent("/promises/new")}`);
      return;
    }

    const user = session.user;
    const counterpartyContact = counterparty.trim();

    if (!counterpartyContact) {
      setBusy(false);
      setError(t("promises.new.errors.counterpartyRequired"));
      return;
    }

    const inviteToken =
      crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const { data: insertData, error: insertError } = await supabase
      .from("promises")
      .insert({
        creator_id: user.id,
        promisor_id: executor === "me" ? user.id : null,
        promisee_id: executor === "other" ? user.id : null,
        title: title.trim(),
        details: details.trim() || null,
        counterparty_contact: counterpartyContact,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        status: "active",
        invite_token: inviteToken,
      })
      .select("id")
      .single();

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/promises/${insertData.id}`);
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(82,193,106,0.22),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_55%_65%,rgba(34,55,93,0.18),transparent_40%)]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-6 rounded-3xl border border-white/10 bg-black/40 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.new.eyebrow")}
              </p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                {t("promises.new.title")}
              </h1>
              <p className="text-sm text-slate-300">{t("promises.new.subtitle")}</p>
            </div>
            <Link
              href="/promises"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100"
            >
              ← {t("promises.new.back")}
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-sm text-slate-200 sm:col-span-2">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.new.fields.executor")}
              </span>
              <div className="flex w-full rounded-2xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setExecutor("me")}
                  className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    executor === "me"
                      ? "bg-emerald-400/90 text-slate-950 shadow shadow-emerald-500/20"
                      : "text-slate-200 hover:text-emerald-100"
                  }`}
                >
                  {t("promises.new.executor.me")}
                </button>
                <button
                  type="button"
                  onClick={() => setExecutor("other")}
                  className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    executor === "other"
                      ? "bg-emerald-400/90 text-slate-950 shadow shadow-emerald-500/20"
                      : "text-slate-200 hover:text-emerald-100"
                  }`}
                >
                  {t("promises.new.executor.other")}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200/80 sm:col-span-2">
              <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-500/10 text-emerald-200">
                i
              </span>
              <p className="leading-relaxed">
                <span className="block">{t("createDeal.philosophy.line1")}</span>
                <span className="block">{t("createDeal.philosophy.line2")}</span>
              </p>
            </div>

            <label className="space-y-2 text-sm text-slate-200 sm:col-span-2">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.new.fields.title")}
              </span>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                placeholder={t("promises.new.placeholders.title")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200 sm:col-span-2">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.new.fields.details")}
              </span>
              <textarea
                className="min-h-[130px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                placeholder={t("promises.new.placeholders.details")}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </label>

            {executor && (
              <label className="space-y-2 text-sm text-slate-200">
                <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                  {executor === "me"
                    ? t("promises.new.fields.counterpartyMe")
                    : t("promises.new.fields.counterpartyOther")}
                </span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                  placeholder={
                    executor === "me"
                      ? t("promises.new.placeholders.counterpartyMe")
                      : t("promises.new.placeholders.counterpartyOther")
                  }
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                />
              </label>
            )}

            <label className="space-y-2 text-sm text-slate-200">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.new.fields.dueDate")}
              </span>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </label>
          </div>

          <div className="space-y-3">
            <button
              onClick={createPromise}
              disabled={busy || !title.trim() || !counterparty.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 disabled:translate-y-0 disabled:opacity-60"
            >
              {busy ? t("promises.new.creating") : t("promises.new.submit")}
            </button>

            {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
          </div>
        </div>
      </div>
    </main>
  );
}

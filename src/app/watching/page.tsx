"use client";
import { useEffect, useState } from "react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";
import { isPromiseStatus } from "@/lib/promiseStatus";

type Watched = { id: string; title: string; status: string; due_at: string | null; creator_id: string; counterparty_id: string | null; promisor_id: string | null; promisee_id: string | null };

export default function WatchingPage() {
  const t = useT();
  const locale = useLocale();
  const [rows, setRows] = useState<Watched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = requireSupabase();
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
          window.location.href = localizeLoginPath(localizePath("/watching", locale), locale);
          return;
        }
        const userId = session.user.id;
        const { data, error: queryError } = await supabase
          .from("promises")
          .select("id,title,status,due_at,creator_id,counterparty_id,promisor_id,promisee_id,agreement_followers!inner(user_id)")
          .eq("visibility", "public")
          .eq("agreement_followers.user_id", userId)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        if (queryError) {
          setError(queryError.message);
          return;
        }
        const watched = (data ?? []).filter((row) => {
          if (!isPromiseStatus((row as { status?: unknown }).status)) return false;
          const participantIds = new Set(
            [row.creator_id, row.counterparty_id, row.promisor_id, row.promisee_id].filter(
              (value): value is string => Boolean(value)
            )
          );
          return !participantIds.has(userId);
        }) as Watched[];
        setRows(watched);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unexpected error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <main className="relative min-h-[calc(100vh-220px)] py-6">
      <div className="relative mx-auto w-full max-w-5xl space-y-4 px-4 sm:px-6">
        <div className="px-1 py-1">
          <h1 className="text-2xl font-semibold text-white">{t("watching.title")}</h1>
          <p className="mt-1 text-sm text-slate-300">{t("watching.subtitle")}</p>
        </div>
        {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        <div className="space-y-3">
          {loading && [1, 2, 3].map((i) => <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-white/5" />)}
          {!loading && rows.map((p) => (
            <LocalizedLink key={p.id} href={`/p/agreements/${p.id}`} className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-300/40 hover:bg-emerald-500/5">
              <div className="text-lg font-semibold text-white">{p.title}</div>
              <div className="mt-1 text-xs text-slate-400">{t("watching.status")}: {p.status}</div>
              {p.due_at && <div className="mt-1 text-xs text-slate-400">{t("watching.deadline")}: {new Date(p.due_at).toLocaleDateString(locale)}</div>}
            </LocalizedLink>
          ))}
          {!loading && rows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-slate-300">
              <p className="text-lg font-semibold text-white">{t("promises.empty.watchingTitle")}</p>
              <p className="text-sm text-slate-400">{t("promises.empty.watchingDescription")}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

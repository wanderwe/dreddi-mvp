"use client";
import { useEffect, useState } from "react";
import { LocalizedLink } from "@/app/components/LocalizedLink";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";

type Watched = { id: string; title: string; status: string; due_at: string | null; creator_id: string; counterparty_id: string | null; promisor_id: string | null; promisee_id: string | null };
const PAGE_SIZE = 12;

export default function WatchingPage() {
  const t = useT();
  const locale = useLocale();
  const [rows, setRows] = useState<Watched[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWatchPage = async (offset: number) => {
    const token = await supabase?.auth
      .getSession()
      .then(({ data }) => data.session?.access_token ?? null)
      .catch(() => null);

    const response = await fetch(`/api/watching?limit=${PAGE_SIZE + 1}&offset=${offset}`, {
      method: "GET",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    return response;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWatchPage(0);
        if (response.status === 401) {
          window.location.href = localizeLoginPath(localizePath("/watching", locale), locale);
          return;
        }

        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setError(typeof payload?.error === "string" ? payload.error : "Unexpected error");
          return;
        }
        const nextRows = Array.isArray(payload?.rows) ? (payload.rows as Watched[]) : [];
        const nextHasMore = nextRows.length > PAGE_SIZE;
        setRows(nextHasMore ? nextRows.slice(0, PAGE_SIZE) : nextRows);
        setHasMore(nextHasMore);
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

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetchWatchPage(rows.length);
      if (response.status === 401) {
        window.location.href = localizeLoginPath(localizePath("/watching", locale), locale);
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "Unexpected error");
        return;
      }

      const nextRows = Array.isArray(payload?.rows) ? (payload.rows as Watched[]) : [];
      const nextHasMore = nextRows.length > PAGE_SIZE;
      const pageRows = nextHasMore ? nextRows.slice(0, PAGE_SIZE) : nextRows;
      setRows((prev) => [...prev, ...pageRows]);
      setHasMore(nextHasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <main className="relative py-6">
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
            </div>
          )}
          {!loading && rows.length > 0 && hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-emerald-300/40 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? t("watching.loadingMore") : t("watching.loadMore")}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

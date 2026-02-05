"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { stripTrailingPeriod } from "@/lib/text";
import { normalizeNotificationType } from "@/lib/notifications/types";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  created_at: string;
  read_at: string | null;
  priority: string;
  type: string | null;
};

export default function NotificationsClient() {
  const t = useT();
  const locale = useLocale();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const pageSize = 12;

  useEffect(() => {
    let active = true;
    let channel: ReturnType<SupabaseClient["channel"]> | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const loadNotifications = async (pageIndex: number, replace = false) => {
      const isInitial = pageIndex === 0 && replace;

      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      let supabase;
      try {
        supabase = requireSupabase();
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : t("notifications.errors.unavailable"));
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        window.location.href = `/login?next=${encodeURIComponent("/notifications")}`;
        return;
      }

      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from("notifications")
        .select("id,type,title,body,cta_label,cta_url,created_at,read_at,priority")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!active) return;

      if (error) {
        setError(error.message);
      } else {
        const payload = (data ?? []) as NotificationRow[];
        setRows((prev) => (replace ? payload : [...prev, ...payload]));
        setHasMore(payload.length === pageSize);
        setPage(pageIndex);
      }

      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    };

    const subscribeToNotifications = (supabase: SupabaseClient, userId: string) => {
      channel = supabase
        .channel(`notifications-feed-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const next = payload.new as NotificationRow;
            setRows((prev) => {
              if (prev.some((row) => row.id === next.id)) return prev;
              return [next, ...prev];
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const next = payload.new as NotificationRow;
            setRows((prev) =>
              prev.map((row) => (row.id === next.id ? { ...row, read_at: next.read_at } : row))
            );
          }
        )
        .subscribe();
    };

    const init = async () => {
      let supabase;
      try {
        supabase = requireSupabase();
      } catch {
        setError(t("notifications.errors.unavailable"));
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        window.location.href = `/login?next=${encodeURIComponent("/notifications")}`;
        return;
      }

      void loadNotifications(0, true);
      subscribeToNotifications(supabase, session.user.id);

      pollId = setInterval(() => {
        void loadNotifications(0, true);
      }, 45000);
    };

    void init();

    return () => {
      active = false;
      if (channel) {
        try {
          const supabase = requireSupabase();
          void supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
      if (pollId) {
        clearInterval(pollId);
      }
    };
  }, [pageSize, t]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    void (async () => {
      setLoadingMore(true);
      setError(null);

      let supabase;
      try {
        supabase = requireSupabase();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("notifications.errors.unavailable"));
        setLoadingMore(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        window.location.href = `/login?next=${encodeURIComponent("/notifications")}`;
        return;
      }

      const nextPage = page + 1;
      const from = nextPage * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from("notifications")
        .select("id,type,title,body,cta_label,cta_url,created_at,read_at,priority")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        setError(error.message);
      } else {
        const payload = (data ?? []) as NotificationRow[];
        setRows((prev) => [...prev, ...payload]);
        setHasMore(payload.length === pageSize);
        setPage(nextPage);
      }

      setLoadingMore(false);
    })();
  };

  const markAsRead = async (id: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, read_at: new Date().toISOString() } : row))
    );

    try {
      const supabase = requireSupabase();
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    } catch {
      // ignore client errors; the UI has already been updated optimistically
    }
  };

  const markAllAsRead = async () => {
    if (markingAll) return;
    const timestamp = new Date().toISOString();
    setMarkingAll(true);
    setRows((prev) =>
      prev.map((row) => (row.read_at ? row : { ...row, read_at: timestamp }))
    );

    try {
      const supabase = requireSupabase();
      await supabase.from("notifications").update({ read_at: timestamp }).is("read_at", null);
    } catch {
      // ignore client errors; the UI has already been updated optimistically
    } finally {
      setMarkingAll(false);
    }
  };

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));

  const resolveLocalized = (key: string, fallback?: string | null) => {
    const resolved = t(key);
    if (resolved.startsWith("⟦missing:")) {
      return fallback ?? "";
    }
    return resolved;
  };

  const resolveTypeKey = (value?: string | null) => {
    if (!value) return null;
    const normalized = normalizeNotificationType(value as never);
    return `notifications.types.${normalized}`;
  };

  const hasUnread = rows.some((row) => !row.read_at);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
            {t("notifications.header.eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold text-white">
            {t("notifications.header.title")}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {t("notifications.header.subtitle")}
          </p>
        </div>
        {hasUnread && (
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            disabled={markingAll}
            className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {t("notifications.markAllRead")}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-slate-300">{t("notifications.loading")}</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-300">
          {t("notifications.empty")}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {rows.map((row) => {
              const unread = !row.read_at;
              const ctaUrl = row.cta_url ?? "/promises";
              const typeKey = resolveTypeKey(row.type);
              const title = typeKey
                ? resolveLocalized(`${typeKey}.title`, row.title)
                : row.title;
              const description = typeKey
                ? resolveLocalized(`${typeKey}.description`, row.body)
                : row.body;
              const ctaLabel = typeKey
                ? resolveLocalized(`${typeKey}.cta`, row.cta_label)
                : row.cta_label ?? "";
              return (
                <div
                  key={row.id}
                  className={`rounded-2xl border px-4 py-4 transition ${
                    unread
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2 w-2 rounded-full ${
                          unread ? "bg-emerald-300" : "bg-transparent"
                        }`}
                        aria-hidden
                      />
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-white">
                          {stripTrailingPeriod(title)}
                        </div>
                        <p className="text-sm text-slate-200">
                          {stripTrailingPeriod(description)}
                        </p>
                        <div className="text-xs text-slate-400">
                          {formatDate(row.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {ctaLabel && (
                        <Link
                          href={ctaUrl}
                          onClick={() => unread && void markAsRead(row.id)}
                          className="cursor-pointer rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          {ctaLabel}
                        </Link>
                      )}
                      {unread && (
                        <button
                          type="button"
                          onClick={() => void markAsRead(row.id)}
                          className="cursor-pointer text-xs text-emerald-200 transition hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          {t("notifications.markRead")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                {loadingMore ? t("notifications.loading") : t("notifications.loadMore")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

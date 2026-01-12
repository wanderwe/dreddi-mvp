"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  created_at: string;
  read_at: string | null;
  priority: string;
};

export default function NotificationsClient() {
  const t = useT();
  const locale = useLocale();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      setLoading(true);
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

      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,cta_label,cta_url,created_at,read_at,priority")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        setError(error.message);
      } else {
        setRows((data ?? []) as NotificationRow[]);
      }

      setLoading(false);
    };

    void loadNotifications();

    return () => {
      active = false;
    };
  }, [t]);

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

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
          {t("notifications.eyebrow")}
        </p>
        <h1 className="text-3xl font-semibold text-white">{t("notifications.title")}</h1>
        <p className="mt-2 text-sm text-slate-300">{t("notifications.subtitle")}</p>
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
        <div className="space-y-3">
          {rows.map((row) => {
            const unread = !row.read_at;
            const ctaUrl = row.cta_url ?? "/promises";
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
                      <div className="text-sm font-semibold text-white">{row.title}</div>
                      <p className="text-sm text-slate-200">{row.body}</p>
                      <div className="text-xs text-slate-400">
                        {formatDate(row.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {row.cta_label && (
                      <Link
                        href={ctaUrl}
                        onClick={() => unread && void markAsRead(row.id)}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-emerald-100"
                      >
                        {row.cta_label}
                      </Link>
                    )}
                    {unread && (
                      <button
                        type="button"
                        onClick={() => void markAsRead(row.id)}
                        className="text-xs text-emerald-200 hover:text-emerald-100"
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
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { accountDeletesAt } from "@/lib/account/constants";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { localizePath } from "@/lib/i18n/routing";
import { supabaseOptional } from "@/lib/supabaseClient";

export default function AccountRestorePage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [deletesAt, setDeletesAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState<"restore" | "logout" | null>(null);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabaseOptional;
    if (!client) return;
    let active = true;

    (async () => {
      const { data: sessionData } = await client.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        router.replace(localizePath("/login", locale));
        return;
      }
      const { data } = await client
        .from("profiles")
        .select("deleted_at")
        .eq("id", userId)
        .maybeSingle<{ deleted_at: string | null }>();
      if (!active) return;
      if (!data?.deleted_at) {
        router.replace(localizePath("/", locale));
        return;
      }
      setDeletesAt(accountDeletesAt(data.deleted_at));
    })();

    return () => {
      active = false;
    };
  }, [router, locale]);

  const restore = async () => {
    const client = supabaseOptional;
    if (!client) return;
    setBusy("restore");
    setError(null);
    try {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/account/restore", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error();
      setRestored(true);
      setTimeout(() => window.location.replace(localizePath("/", locale)), 900);
    } catch {
      setError(t("account.restore.error"));
      setBusy(null);
    }
  };

  const logout = async () => {
    setBusy("logout");
    await supabaseOptional?.auth.signOut().catch(() => null);
    window.location.replace(localizePath("/", locale));
  };

  const dateLabel = deletesAt
    ? new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(deletesAt)
    : "";

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md items-center px-4 py-12">
      {deletesAt && (
        <div className="w-full rounded-2xl border border-tone-white/10 bg-[var(--surface-popover)] p-5 shadow-2xl shadow-tone-black/40">
          <h1 className="text-lg font-semibold text-tone-white">{t("account.restore.title")}</h1>
          <p className="mt-2 text-sm text-tone-300">{t("account.restore.body", { date: dateLabel })}</p>

          {error && (
            <div className="mt-4 rounded-xl border border-danger-400/30 bg-red-500/10 px-3 py-2 text-xs text-danger-200">
              {error}
            </div>
          )}

          {restored ? (
            <div className="mt-4 rounded-xl border border-accent-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-accent-200">
              {t("account.restore.restored")}
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={restore}
                disabled={busy !== null}
                className="cursor-pointer rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("account.restore.button")}
              </button>
              <button
                type="button"
                onClick={logout}
                disabled={busy !== null}
                className="cursor-pointer rounded-xl border border-tone-white/10 px-4 py-2 text-sm font-semibold text-tone-white transition hover:border-tone-white/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("nav.logout")}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

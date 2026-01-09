"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DreddiLogo } from "@/app/components/DreddiLogo";
import { HeaderActions } from "@/app/components/HeaderActions";
import { MobileMenu } from "@/app/components/MobileMenu";
import { useT } from "@/lib/i18n/I18nProvider";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";

const PAGE_LIMIT = 20;

type PublicProfileStat = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  reputation_score: number | null;
  confirmed_count: number | null;
  disputed_count: number | null;
  last_activity_at: string | null;
  profile_id?: string | null;
};

const escapeIlike = (value: string) => value.replace(/[%,_]/g, (match) => `\\${match}`);

export default function PublicProfilesPage() {
  const t = useT();
  const [email, setEmail] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [profiles, setProfiles] = useState<PublicProfileStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const isAuthenticated = Boolean(email);

  useEffect(() => {
    let active = true;

    if (!supabase) return () => {};

    const syncSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      setEmail(sessionData.session?.user?.email ?? null);
    };

    void syncSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    let active = true;

    const loadProfiles = async () => {
      if (!supabase) {
        setError(t("publicProfiles.errors.supabase"));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const baseQuery = supabase
        .from("public_profile_stats")
        .select(
          "handle,display_name,avatar_url,reputation_score,confirmed_count,disputed_count,last_activity_at,profile_id"
        )
        .limit(PAGE_LIMIT);

      const request = debouncedQuery
        ? baseQuery.or(
            `handle.ilike.%${escapeIlike(debouncedQuery)}%,display_name.ilike.%${escapeIlike(
              debouncedQuery
            )}%`
          )
        : baseQuery
            .order("last_activity_at", { ascending: false })
            .order("reputation_score", { ascending: false });

      const { data, error: loadError } = await request;

      if (!active) return;

      if (loadError) {
        setError(loadError.message);
        setProfiles([]);
      } else {
        setProfiles((data ?? []) as PublicProfileStat[]);
      }

      setLoading(false);
    };

    void loadProfiles();

    return () => {
      active = false;
    };
  }, [debouncedQuery, refreshIndex, t]);

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  const emptyState = !loading && !error && profiles.length === 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(82,193,106,0.2),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_60%_70%,rgba(34,55,93,0.22),transparent_45%)]"
        aria-hidden
      />

      <header className="relative border-b border-white/10 bg-black/30/50 backdrop-blur">
        <div className="relative mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-4 px-6 py-4 md:flex-wrap">
          <Link href="/" className="flex min-w-0 items-center text-white">
            <DreddiLogo
              accentClassName="text-xs"
              markClassName="h-11 w-11"
              titleClassName="text-lg"
            />
          </Link>

          <HeaderActions
            className="hidden md:flex"
            isAuthenticated={isAuthenticated}
            onLogout={logout}
          />
          <MobileMenu isAuthenticated={isAuthenticated} onLogout={logout} />
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-white">{t("publicProfiles.title")}</h1>
          <p className="text-sm text-slate-300">{t("publicProfiles.subtitle")}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-emerald-200">
            {t("publicProfiles.searchLabel")}
            <input
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
              placeholder={t("publicProfiles.searchPlaceholder")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
            {t("publicProfiles.loading")}
          </div>
        ) : error ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-5 text-sm text-red-200">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setRefreshIndex((value) => value + 1)}
              className="w-fit rounded-xl border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-100 transition hover:border-red-200"
            >
              {t("publicProfiles.retry")}
            </button>
          </div>
        ) : emptyState ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
            {debouncedQuery ? t("publicProfiles.empty") : t("publicProfiles.emptyRecent")}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {profiles.map((profile) => {
              const displayName = profile.display_name?.trim() || profile.handle;
              const score = profile.reputation_score ?? 50;
              const confirmedCount = profile.confirmed_count ?? 0;
              const disputedCount = profile.disputed_count ?? 0;
              const key = profile.profile_id || profile.handle;

              return (
                <div
                  key={key}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/10">
                      {profile.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar_url}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-white/80">
                          {displayName.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-white">{displayName}</div>
                      <div className="text-xs text-slate-400">@{profile.handle}</div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
                        <span>
                          {t("publicProfile.reputation")} · <span className="text-white">{score}</span>
                        </span>
                        <span>
                          {t("publicProfile.confirmed")} · <span className="text-white">{confirmedCount}</span>
                        </span>
                        <span>
                          {t("publicProfile.disputed")} · <span className="text-white">{disputedCount}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/u/${profile.handle}`}
                    className="w-fit rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-200"
                  >
                    {t("publicProfiles.viewProfile")}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

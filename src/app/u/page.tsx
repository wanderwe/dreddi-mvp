"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n/I18nProvider";
import { publicProfileDirectorySelect } from "@/lib/publicProfileQueries";

type PublicProfileDirectoryRow = {
  handle: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  reputation_score: number | null;
  confirmed_count: number | null;
  completed_count: number | null;
  disputed_count: number | null;
};

export default function PublicProfilesDirectoryPage() {
  const t = useT();
  const pageSize = 12;
  const [profiles, setProfiles] = useState<PublicProfileDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasRequestedMore, setHasRequestedMore] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => {
      window.clearTimeout(handle);
    };
  }, [searchTerm]);

  useEffect(() => {
    let active = true;

    const loadProfiles = async () => {
      if (!supabase) {
        setError(t("publicDirectory.errors.supabase"));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setLoadMoreError(null);
      setHasRequestedMore(false);

      const normalizedSearch = debouncedSearch.startsWith("@")
        ? debouncedSearch.slice(1)
        : debouncedSearch;
      let query = supabase
        .from("public_profile_stats")
        .select(publicProfileDirectorySelect)
        .order("confirmed_count", { ascending: false })
        .order("handle", { ascending: true });

      if (normalizedSearch) {
        const searchPattern = `%${normalizedSearch}%`;
        query = query.or(`handle.ilike.${searchPattern},email.ilike.${searchPattern}`);
      }

      const { data, error: listError } = await query.range(0, pageSize - 1);

      if (!active) return;

      if (listError) {
        setError(listError.message);
        setProfiles([]);
        setHasMore(false);
      } else {
        const nextProfiles = (data ?? []) as PublicProfileDirectoryRow[];
        setProfiles(nextProfiles);
        setHasMore(nextProfiles.length === pageSize);
      }

      setLoading(false);
    };

    void loadProfiles();

    return () => {
      active = false;
    };
  }, [debouncedSearch, pageSize, t]);

  const loadMore = async () => {
    if (!supabase) {
      setLoadMoreError(t("publicDirectory.errors.supabase"));
      return;
    }

    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setLoadMoreError(null);
    setHasRequestedMore(true);

    const startIndex = profiles.length;
    const normalizedSearch = debouncedSearch.startsWith("@")
      ? debouncedSearch.slice(1)
      : debouncedSearch;
    let query = supabase
      .from("public_profile_stats")
      .select(publicProfileDirectorySelect)
      .order("confirmed_count", { ascending: false })
      .order("handle", { ascending: true });

    if (normalizedSearch) {
      const searchPattern = `%${normalizedSearch}%`;
      query = query.or(`handle.ilike.${searchPattern},email.ilike.${searchPattern}`);
    }

    const { data, error: listError } = await query.range(
      startIndex,
      startIndex + pageSize - 1
    );

    if (listError) {
      setLoadMoreError(listError.message);
      setLoadingMore(false);
      return;
    }

    const nextProfiles = (data ?? []) as PublicProfileDirectoryRow[];
    setProfiles((prev) => [...prev, ...nextProfiles]);
    setHasMore(nextProfiles.length === pageSize);
    setLoadingMore(false);
  };

  const cards = useMemo(
    () =>
      profiles.map((profile) => {
        const displayName = profile.display_name?.trim() || profile.handle;
        const confirmedCount = profile.confirmed_count ?? 0;
        const disputedCount = profile.disputed_count ?? 0;
        const reputationScore = profile.reputation_score ?? 50;

        return (
          <Link
            key={profile.handle}
            href={`/u/${encodeURIComponent(profile.handle)}`}
            className="group relative flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-300/40 hover:bg-emerald-500/5 sm:p-5"
          >
            <div className="absolute right-4 top-4 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-semibold text-white shadow-sm shadow-black/30">
              <span className="sr-only">{t("publicProfile.reputationScore")}</span>
              {reputationScore}
            </div>
            <div className="flex items-center gap-4 pr-12">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/10">
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
              <div className="flex flex-1 items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-white">{displayName}</div>
                  <div className="text-sm text-white/60">@{profile.handle}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-white/70">
              <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-1">
                {t("publicProfile.confirmed")}: {confirmedCount}
              </span>
              <span className="rounded-full border border-red-300/30 bg-red-500/10 px-2 py-1">
                {t("publicProfile.disputed")}: {disputedCount}
              </span>
            </div>
          </Link>
        );
      }),
    [profiles, t]
  );

  const isSearchActive = debouncedSearch.length > 0;
  const showNoMore = hasRequestedMore && !hasMore && !isSearchActive;
  const showLoadMoreButton = hasMore;

  return (
    <main className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">{t("publicDirectory.title")}</h1>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="public-profile-search" className="sr-only">
            {t("publicDirectory.searchLabel")}
          </label>
          <input
            id="public-profile-search"
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
            }}
            placeholder={t("publicDirectory.searchPlaceholder")}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a]"
          />
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/70">
            {t("publicDirectory.loading")}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/70">
            {error}
          </div>
        ) : profiles.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/70">
            {t("publicDirectory.empty")}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              {cards}
            </div>
            <div className="flex flex-col items-center gap-2">
              {(showLoadMoreButton || showNoMore) && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore || !hasMore}
                  className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  {loadingMore
                    ? t("publicDirectory.loadingMore")
                    : hasMore
                      ? t("publicDirectory.loadMore")
                      : t("publicDirectory.noMore")}
                </button>
              )}
              {loadMoreError && (
                <div className="text-xs text-white/60">{loadMoreError}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

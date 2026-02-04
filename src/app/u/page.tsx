"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n/I18nProvider";
import { publicProfileDirectorySelect } from "@/lib/publicProfileQueries";
import { getPublicProfileIdentity } from "@/lib/publicProfileIdentity";

type PublicProfileDirectoryRow = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  reputation_score: number | null;
  confirmed_count: number | null;
  completed_count: number | null;
  disputed_count: number | null;
  unique_counterparties_count: number | null;
  deals_with_due_date_count: number | null;
  on_time_completion_count: number | null;
  reputation_age_days: number | null;
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
  const [canUseEmailSearch, setCanUseEmailSearch] = useState(false);

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

    const checkAuth = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setCanUseEmailSearch(Boolean(data.session));
    };

    void checkAuth();

    return () => {
      active = false;
    };
  }, []);

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
      setHasMore(true);

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
        const filters = [`handle.ilike.${searchPattern}`, `display_name.ilike.${searchPattern}`];
        if (canUseEmailSearch && normalizedSearch.includes("@")) {
          filters.push(`email.eq.${normalizedSearch.toLowerCase()}`);
        }
        query = query.or(filters.join(","));
      }

      const { data, error: listError } = await query.range(0, pageSize);

      if (!active) return;

      if (listError) {
        setError(listError.message);
        setProfiles([]);
        setHasMore(false);
      } else {
        const nextProfiles = (data ?? []) as PublicProfileDirectoryRow[];
        const nextHasMore = nextProfiles.length > pageSize;
        setProfiles(nextHasMore ? nextProfiles.slice(0, pageSize) : nextProfiles);
        setHasMore(nextHasMore);
      }

      setLoading(false);
    };

    void loadProfiles();

    return () => {
      active = false;
    };
  }, [canUseEmailSearch, debouncedSearch, pageSize, t]);

  const loadMore = async () => {
    if (!supabase) {
      setLoadMoreError(t("publicDirectory.errors.supabase"));
      return;
    }

    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setLoadMoreError(null);

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
      const filters = [`handle.ilike.${searchPattern}`, `display_name.ilike.${searchPattern}`];
      if (canUseEmailSearch && normalizedSearch.includes("@")) {
        filters.push(`email.eq.${normalizedSearch.toLowerCase()}`);
      }
      query = query.or(filters.join(","));
    }

    const { data, error: listError } = await query.range(startIndex, startIndex + pageSize);

    if (listError) {
      setLoadMoreError(listError.message);
      setLoadingMore(false);
      return;
    }

    const nextProfiles = (data ?? []) as PublicProfileDirectoryRow[];
    const nextHasMore = nextProfiles.length > pageSize;
    setProfiles((prev) => [
      ...prev,
      ...(nextHasMore ? nextProfiles.slice(0, pageSize) : nextProfiles),
    ]);
    setHasMore(nextHasMore);
    setLoadingMore(false);
  };

  const cards = useMemo(
    () =>
      profiles.map((profile) => {
        const { title, subtitle, maskedEmail } = getPublicProfileIdentity({
          displayName: profile.display_name,
          handle: profile.handle,
        });
        const avatarLabel = (title || profile.handle).replace(/^@/, "");
        const showMaskedEmail =
          maskedEmail && maskedEmail !== title && maskedEmail !== subtitle ? maskedEmail : null;
        const confirmedCount = profile.confirmed_count ?? 0;
        const disputedCount = profile.disputed_count ?? 0;
        const reputationScore = profile.reputation_score ?? 50;

        return (
          <Link
            key={profile.handle}
            href={`/u/${encodeURIComponent(profile.handle)}?from=profiles`}
            className="group relative flex w-full min-w-0 flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-300/40 hover:bg-emerald-500/5 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-4 pr-0 sm:pr-12">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/10">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-white/80">
                      {avatarLabel.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-white truncate">{title}</div>
                  {subtitle && <div className="text-sm text-white/60 truncate">{subtitle}</div>}
                  {showMaskedEmail && (
                    <div className="text-xs text-white/40 truncate">{showMaskedEmail}</div>
                  )}
                </div>
              </div>
              <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-semibold text-white shadow-sm shadow-black/30 sm:absolute sm:right-4 sm:top-4">
                <span className="sr-only">{t("publicProfile.reputationScore")}</span>
                {reputationScore}
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

  const showLoadMoreButton = hasMore;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0b0f1a] text-white">
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
            <div className="grid w-full gap-4 md:grid-cols-2">
              {cards}
            </div>
            <div className="flex flex-col items-center gap-2">
              {showLoadMoreButton && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore || !hasMore}
                  className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  {loadingMore
                    ? t("publicDirectory.loadingMore")
                    : t("publicDirectory.loadMore")}
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

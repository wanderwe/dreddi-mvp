"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n/I18nProvider";

type PublicProfileDirectoryRow = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  confirmed_count: number | null;
  disputed_count: number | null;
};

export default function PublicProfilesDirectoryPage() {
  const t = useT();
  const router = useRouter();
  const [profiles, setProfiles] = useState<PublicProfileDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }, [router]);

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

      const { data, error: listError } = await supabase
        .from("public_profile_stats")
        .select("handle,display_name,avatar_url,confirmed_count,disputed_count")
        .order("confirmed_count", { ascending: false })
        .order("handle", { ascending: true });

      if (!active) return;

      if (listError) {
        setError(listError.message);
        setProfiles([]);
      } else {
        setProfiles((data ?? []) as PublicProfileDirectoryRow[]);
      }

      setLoading(false);
    };

    void loadProfiles();

    return () => {
      active = false;
    };
  }, [t]);

  const cards = useMemo(
    () =>
      profiles.map((profile) => {
        const displayName = profile.display_name?.trim() || profile.handle;
        const confirmedCount = profile.confirmed_count ?? 0;
        const disputedCount = profile.disputed_count ?? 0;

        return (
          <Link
            key={profile.handle}
            href={`/u/${encodeURIComponent(profile.handle)}`}
            className="group flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-emerald-300/40 hover:bg-emerald-500/5"
          >
            <div className="flex items-center gap-4">
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
              <div>
                <div className="text-lg font-semibold text-white">{displayName}</div>
                <div className="text-sm text-white/60">@{profile.handle}</div>
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

  return (
    <main className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">{t("publicDirectory.title")}</h1>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100"
          >
            ← {t("publicDirectory.back")}
          </button>
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
          <div className="grid gap-4 md:grid-cols-2">
            {cards}
          </div>
        )}
      </div>
    </main>
  );
}

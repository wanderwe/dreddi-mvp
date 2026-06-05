"use client";

import { useEffect, useState } from "react";
import { requireSupabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n/I18nProvider";
import { syncSocialLinks } from "@/lib/syncSocialLinks";
import { HelperText } from "@/app/components/ui/HelperText";

type SocialLink = {
  platform: string;
  username: string | null;
  display_name: string | null;
  profile_url: string | null;
  verified_at: string;
};

type PlatformConfig = {
  id: string;
  provider: "twitter" | "linkedin_oidc";
  label: string;
  color: string;
  icon: React.ReactNode;
  usernamePrefix?: string;
};

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const PLATFORMS: PlatformConfig[] = [
  {
    id: "linkedin",
    provider: "linkedin_oidc",
    label: "LinkedIn",
    color: "text-blue-400",
    icon: <LinkedInIcon />,
  },
  {
    id: "twitter",
    provider: "twitter",
    label: "Twitter / X",
    color: "text-sky-300",
    icon: <TwitterIcon />,
    usernamePrefix: "@",
  },
];

type Props = {
  /** Called after a link/unlink so the parent can refresh if needed */
  onUpdate?: () => void;
};

export function SocialLinksSection({ onUpdate }: Props) {
  const t = useT();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);
  // profile_url inputs — keyed by platform id (only linkedin for now)
  const [profileUrlInputs, setProfileUrlInputs] = useState<Record<string, string>>({});

  const loadLinks = async () => {
    try {
      const supabase = requireSupabase();
      const { data } = await supabase
        .from("social_links")
        .select("platform,username,display_name,profile_url,verified_at");
      const loaded = (data as SocialLink[]) ?? [];
      setLinks(loaded);
      // Sync profile URL inputs from DB
      const urls: Record<string, string> = {};
      for (const l of loaded) {
        if (l.profile_url) urls[l.platform] = l.profile_url;
      }
      setProfileUrlInputs((prev) => ({ ...prev, ...urls }));
    } catch {
      // supabase unavailable in preview
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // On mount: sync any OAuth identities that may not yet be in social_links
    // (e.g. when the callback redirected to prod before this code was deployed)
    (async () => {
      try {
        const supabase = requireSupabase();
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          await syncSocialLinks(supabase, data.user);
        }
      } catch {
        // ignore — supabase unavailable in preview
      }
      await loadLinks();
    })();
  }, []);

  const handleConnect = async (platform: PlatformConfig) => {
    setError(null);
    setBusy(platform.id);
    try {
      const supabase = requireSupabase();
      const redirectTo =
        `${window.location.origin}/auth/callback?next=` +
        encodeURIComponent("/u?linked=" + platform.id);

      const { error } = await supabase.auth.linkIdentity({
        provider: platform.provider,
        options: { redirectTo },
      });
      if (error) {
        setError(error.message);
        setBusy(null); // clear busy so button is clickable again
      }
      // On success the page will redirect; no need to update state here
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
      setBusy(null);
    }
  };

  const handleDisconnect = async (platformId: string) => {
    setError(null);
    setBusy(platformId);
    try {
      const supabase = requireSupabase();

      // Also try to unlink the Supabase identity (only works if user has other auth methods)
      const { data: userData } = await supabase.auth.getUser();
      const identity = userData?.user?.identities?.find(
        (i) =>
          (i.provider === platformId) ||
          (platformId === "linkedin" && i.provider === "linkedin_oidc")
      );
      if (identity) {
        // Best-effort — may fail if it's the only auth method
        await supabase.auth.unlinkIdentity(identity).catch(() => {});
      }

      // Always remove from our social_links table
      await supabase.from("social_links").delete().eq("platform", platformId);

      setLinks((prev) => prev.filter((l) => l.platform !== platformId));
      onUpdate?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setBusy(null);
    }
  };

  // After OAuth redirect back, re-sync in case the callback missed it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linked = params.get("linked");
    if (!linked) return;

    (async () => {
      try {
        const supabase = requireSupabase();
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          await syncSocialLinks(supabase, data.user);
          await loadLinks();
          onUpdate?.();
          // Clean up URL param
          const url = new URL(window.location.href);
          url.searchParams.delete("linked");
          window.history.replaceState({}, "", url.toString());
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeLinkedInUrl = (raw: string): string | null => {
    const s = raw.trim();
    if (!s) return null;
    // Accept: linkedin.com/in/foo, /in/foo, https://... → normalize to https://
    const match = s.match(/(?:linkedin\.com\/in\/)([\w-]+)/i);
    if (match) return `https://www.linkedin.com/in/${match[1]}`;
    return null;
  };

  const saveProfileUrl = async (platformId: string, raw: string) => {
    const url = normalizeLinkedInUrl(raw);
    const stored = links.find((l) => l.platform === platformId)?.profile_url ?? null;
    // Only save if value actually changed
    if (url === stored) return;
    try {
      const supabase = requireSupabase();
      await supabase
        .from("social_links")
        .update({ profile_url: url })
        .eq("platform", platformId);
      setLinks((prev) =>
        prev.map((l) => l.platform === platformId ? { ...l, profile_url: url } : l)
      );
      if (url) setProfileUrlInputs((prev) => ({ ...prev, [platformId]: url }));
    } catch {
      // ignore
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-red-300">{error}</p>
      )}
      {PLATFORMS.map((platform) => {
        const linked = links.find((l) => l.platform === platform.id);
        const isBusy = busy === platform.id;

        const showUrlField = linked && platform.id === "linkedin";
        const urlInput = profileUrlInputs[platform.id] ?? "";

        return (
          <div
            key={platform.id}
            className="rounded-xl border border-white/10 bg-white/5"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={platform.color}>{platform.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{platform.label}</p>
                {linked ? (
                  <p className="text-xs text-emerald-300">
                    {linked.username
                      ? `${platform.usernamePrefix ?? ""}${linked.username}`
                      : linked.display_name ?? t("profileSettings.social.connected")}
                  </p>
                ) : (
                  <p className="text-xs text-white/40">{t("profileSettings.social.notConnected")}</p>
                )}
              </div>
            </div>

            {linked ? (
              confirmDisconnect === platform.id ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDisconnect(null)}
                    className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/50 transition hover:text-white"
                  >
                    {t("profileSettings.social.cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => { setConfirmDisconnect(null); void handleDisconnect(platform.id); }}
                    className="cursor-pointer rounded-lg border border-red-400/40 bg-red-500/15 px-2.5 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isBusy ? "…" : t("profileSettings.social.confirmDisconnect")}
                  </button>
                </div>
              ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setConfirmDisconnect(platform.id)}
                className="shrink-0 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("profileSettings.social.disconnect")}
              </button>
              )
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleConnect(platform)}
                className="shrink-0 cursor-pointer rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:border-emerald-300/50 hover:bg-emerald-500/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? "…" : t("profileSettings.social.connect")}
              </button>
            )}
            </div>

            {/* Optional LinkedIn profile URL — appears after connecting */}
            {showUrlField && (
              <div className="border-t border-white/10 px-4 pb-3 pt-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) =>
                    setProfileUrlInputs((prev) => ({ ...prev, [platform.id]: e.target.value }))
                  }
                  onBlur={() => void saveProfileUrl(platform.id, urlInput)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  placeholder="linkedin.com/in/your-username"
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/80 placeholder:text-white/25 focus:border-blue-400/40 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
                />
                <HelperText className="mt-1.5">
                  {t("profileSettings.social.linkedinUrlLabel")}
                </HelperText>
              </div>
            )}
          </div>
        );
      })}

      <HelperText className="mt-1">
        {t("profileSettings.social.hint")}
      </HelperText>
    </div>
  );
}

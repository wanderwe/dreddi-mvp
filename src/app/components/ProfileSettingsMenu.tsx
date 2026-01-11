"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UserRound, X } from "lucide-react";
import { requireSupabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetOverlay,
  SheetPortal,
  SheetTrigger,
} from "@/app/components/ui/sheet";

type ProfileSettingsPanelProps = {
  showTitle?: boolean;
  className?: string;
};

type ProfileState = {
  userId: string;
  email: string | null;
  handle: string | null;
};

export function ProfileSettingsPanel({ showTitle = true, className = "" }: ProfileSettingsPanelProps) {
  const t = useT();
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastHandleRef = useRef<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      let supabase;
      try {
        supabase = requireSupabase();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : t("profileSettings.errors.unavailable"));
          setLoading(false);
        }
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!active) return;

      if (sessionError || !session) {
        setError(sessionError?.message ?? t("profileSettings.errors.notAuthenticated"));
        setLoading(false);
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("handle")
        .eq("id", session.user.id)
        .single();

      if (!active) return;

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      const handle = (data as { handle?: string | null } | null)?.handle ?? null;
      if (handle) lastHandleRef.current = handle;
      setProfile({
        userId: session.user.id,
        email: session.user.email ?? null,
        handle,
      });
      setLoading(false);
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const defaultHandle = useMemo(() => {
    if (!profile) return "";
    return profile.email?.split("@")[0].toLowerCase() ?? `user_${profile.userId.slice(0, 6)}`;
  }, [profile]);

  const isPublic = Boolean(profile?.handle);
  const publicProfileLink =
    profile?.handle && origin ? `${origin}/u/${profile.handle}` : "";

  const handleToggle = async () => {
    if (!profile || saving) return;
    setSaving(true);
    setError(null);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profileSettings.errors.unavailable"));
      setSaving(false);
      return;
    }

    const nextPublic = !isPublic;
    const nextHandle = nextPublic
      ? lastHandleRef.current ?? profile.handle ?? defaultHandle
      : null;

    if (!nextPublic && profile.handle) {
      lastHandleRef.current = profile.handle;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ handle: nextHandle })
      .eq("id", profile.userId);

    if (updateError) {
      setError(updateError.message ?? t("profileSettings.errors.saveFailed"));
      setSaving(false);
      return;
    }

    setProfile((prev) => (prev ? { ...prev, handle: nextHandle } : prev));
    setSaving(false);
  };

  return (
    <div className={className}>
      {showTitle && (
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-200">
            {t("profileSettings.sectionLabel")}
          </div>
          <h2 className="text-lg font-semibold text-white">{t("profileSettings.title")}</h2>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white">
                {t("profileSettings.publicLabel")}
              </div>
              <p className="text-xs text-slate-300">
                {t("profileSettings.publicDescription")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                  isPublic
                    ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-200"
                    : "border-white/15 bg-white/5 text-slate-300"
                }`}
              >
                {isPublic
                  ? t("profileSettings.status.public")
                  : t("profileSettings.status.private")}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                aria-label={t("profileSettings.toggleLabel")}
                onClick={handleToggle}
                disabled={loading || saving || !profile}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                  isPublic
                    ? "border-emerald-300/50 bg-emerald-400/70"
                    : "border-white/20 bg-white/10"
                } ${loading || saving ? "opacity-60" : "hover:border-emerald-300/60"}`}
              >
                <span
                  className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition ${
                    isPublic ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
          {loading && (
            <p className="mt-3 text-xs text-slate-400">{t("profileSettings.loading")}</p>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-white">
              {t("profileSettings.linkLabel")}
            </div>
            <p className="text-xs text-slate-300">
              {t("profileSettings.linkDescription")}
            </p>
          </div>
          {isPublic && publicProfileLink ? (
            <a
              href={publicProfileLink}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/70 hover:text-white"
              rel="noreferrer"
              target="_blank"
            >
              {publicProfileLink}
            </a>
          ) : (
            <p className="mt-3 text-xs text-slate-400">
              {t("profileSettings.linkHint")}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

type ProfileSettingsMenuProps = {
  variant?: "icon" | "text";
  className?: string;
};

export function ProfileSettingsMenu({ variant = "icon", className = "" }: ProfileSettingsMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        aria-label={t("profileSettings.buttonLabel")}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:border-emerald-300/50 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${className}`}
      >
        <UserRound className="h-4 w-4" aria-hidden />
      </button>
    ) : (
      <button
        type="button"
        className={`w-full rounded-xl border border-white/10 px-3 py-2 text-left text-white transition hover:border-emerald-300/50 hover:text-emerald-100 ${className}`}
      >
        {t("profileSettings.buttonLabel")}
      </button>
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetPortal>
        <SheetOverlay />
        <SheetContent className="flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                {t("profileSettings.sectionLabel")}
              </div>
              <h2 className="text-lg font-semibold text-white">{t("profileSettings.title")}</h2>
            </div>
            <SheetClose asChild>
              <button
                type="button"
                className="rounded-lg border border-white/10 p-2 text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100"
                aria-label={t("profileSettings.close")}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </SheetClose>
          </div>
          <ProfileSettingsPanel showTitle={false} className="mt-4" />
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}

export default ProfileSettingsMenu;

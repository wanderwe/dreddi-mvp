"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { requireSupabase } from "@/lib/supabaseClient";

type ProfileHandleCardProps = {
  variant?: "mini" | "full";
  className?: string;
};

const HANDLE_REGEX = /^[a-z0-9_-]{3,20}$/;

export function ProfileHandleCard({ variant = "full", className = "" }: ProfileHandleCardProps) {
  const t = useT();
  const [handle, setHandle] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftHandle, setDraftHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

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
          setError(err instanceof Error ? err.message : t("profile.errors.loadFailed"));
          setLoading(false);
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      const user = sessionData.session?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("handle")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        setError(profileError.message);
      } else {
        setHandle(data?.handle ?? null);
        setDraftHandle(data?.handle ?? "");
      }

      setLoading(false);
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [t]);

  const profileLink = useMemo(() => {
    if (!origin || !handle) return "";
    return `${origin}/u/${handle}`;
  }, [handle, origin]);

  const showCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const fallbackCopy = () => {
    setShowFallback(true);
    window.requestAnimationFrame(() => {
      const input = fallbackInputRef.current;
      if (!input) return;
      input.focus();
      input.select();
      input.setSelectionRange(0, input.value.length);
      try {
        if (document.execCommand("copy")) {
          showCopied();
        }
      } catch {
        // noop - user can copy manually
      }
    });
  };

  const handleCopyLink = async () => {
    if (!profileLink) return;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(profileLink);
        showCopied();
        return;
      } catch {
        fallbackCopy();
        return;
      }
    }

    fallbackCopy();
  };

  const handleOpenLink = () => {
    if (!profileLink) return;
    window.open(profileLink, "_blank", "noopener,noreferrer");
  };

  const startEdit = () => {
    setDraftHandle(handle ?? "");
    setFormError(null);
    setSaved(false);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraftHandle(handle ?? "");
    setFormError(null);
    setIsEditing(false);
  };

  const saveHandle = async () => {
    if (!userId) return;
    const normalized = draftHandle.trim().toLowerCase();

    if (!HANDLE_REGEX.test(normalized)) {
      setFormError(t("profile.errors.invalidHandle"));
      return;
    }

    if (normalized === handle) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    setFormError(null);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("profile.errors.updateFailed"));
      setSaving(false);
      return;
    }

    const { data: existing, error: existingError } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", normalized)
      .neq("id", userId)
      .limit(1);

    if (existingError) {
      setFormError(existingError.message);
      setSaving(false);
      return;
    }

    if (existing && existing.length > 0) {
      setFormError(t("profile.errors.handleTaken"));
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ handle: normalized })
      .eq("id", userId);

    if (updateError) {
      setFormError(updateError.message ?? t("profile.errors.updateFailed"));
      setSaving(false);
      return;
    }

    setHandle(normalized);
    setDraftHandle(normalized);
    setIsEditing(false);
    setSaved(true);
    setSaving(false);
  };

  const containerClass =
    variant === "mini"
      ? "rounded-2xl border border-white/10 bg-black/30 p-4"
      : "rounded-3xl border border-white/10 bg-black/40 p-6 shadow-xl shadow-black/30 backdrop-blur";

  const titleClass = variant === "mini" ? "text-sm font-semibold" : "text-lg font-semibold";

  return (
    <section className={`${containerClass} ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={`${titleClass} text-white`}>{t("profile.publicProfile")}</h2>
        {!isEditing && handle && (
          <button
            type="button"
            onClick={startEdit}
            className="text-xs font-semibold text-emerald-200 hover:text-emerald-100"
          >
            {t("profile.editHandle")}
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-3 h-10 animate-pulse rounded-xl bg-white/5" />
      ) : error ? (
        <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      ) : handle ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-300 break-all">
            {profileLink}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenLink}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-100"
            >
              {t("profile.open")}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/45"
            >
              {t("profile.copyLink")}
            </button>
            {copied && (
              <span className="text-xs font-medium text-emerald-200">{t("profile.copied")}</span>
            )}
          </div>

          {showFallback && (
            <input
              ref={fallbackInputRef}
              readOnly
              value={profileLink}
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-slate-200"
              aria-label={t("profile.copyLink")}
            />
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-3 text-sm text-slate-300">
          <p className="text-xs text-slate-400">{t("profile.setHandleHint")}</p>
          {!isEditing && (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/45"
            >
              {t("profile.setHandle")}
            </button>
          )}
        </div>
      )}

      {isEditing && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-slate-400">
              {t("profile.editHandle")}
            </label>
            <input
              value={draftHandle}
              onChange={(event) => setDraftHandle(event.target.value.toLowerCase())}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              placeholder="your-handle"
              maxLength={20}
            />
            <p className="mt-2 text-xs text-amber-200">
              {t("profile.handleWarning")}
            </p>
          </div>

          {formError && <p className="text-xs text-red-200">{formError}</p>}
          {saved && <p className="text-xs text-emerald-200">{t("profile.saved")}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveHandle}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/45 disabled:opacity-60"
            >
              {saving ? t("profile.saving") : t("profile.save")}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              {t("profile.cancel")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProfileHandleCard;

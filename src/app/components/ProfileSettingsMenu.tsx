"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, UserRound, X } from "lucide-react";
import { getAuthState, type AuthState } from "@/lib/auth/getAuthState";
import { requireSupabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n/I18nProvider";
import { SettingRow } from "@/app/components/SettingRow";
import { IconButton } from "@/app/components/ui/IconButton";
import { TimePicker } from "@/app/components/ui/TimePicker";
import { Tooltip } from "@/app/components/ui/Tooltip";
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
  displayName: string | null;
  profileTags: string[];
  isPublic: boolean;
  pushEnabled: boolean;
  deadlineRemindersEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export function ProfileSettingsPanel({ showTitle = true, className = "" }: ProfileSettingsPanelProps) {
  const t = useT();
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [quietHoursStartInput, setQuietHoursStartInput] = useState("22:00");
  const [quietHoursEndInput, setQuietHoursEndInput] = useState("09:00");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [handleInput, setHandleInput] = useState("");
  const [profileTagsInput, setProfileTagsInput] = useState("");
  const [profileTags, setProfileTags] = useState<string[]>([]);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<"identity" | "notifications">("identity");
  const lastHandleRef = useRef<string | null>(null);
  const maxTags = 7;
  const minTagLength = 2;
  const maxTagLength = 24;

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      const nextAuthState = await getAuthState();
      if (!active) return;
      setAuthState(nextAuthState);

      if (nextAuthState.isMock) {
        const profileSnapshot = nextAuthState.profile;
        if (profileSnapshot?.handle) {
          lastHandleRef.current = profileSnapshot.handle;
        }
        setProfile({
          userId: nextAuthState.user?.id ?? "mock-user",
          email: nextAuthState.user?.email ?? null,
          handle: profileSnapshot?.handle ?? "mock-user",
          displayName: profileSnapshot?.displayName ?? null,
          profileTags: [],
          isPublic: true,
          pushEnabled: true,
          deadlineRemindersEnabled: true,
          quietHoursEnabled: true,
          quietHoursStart: "22:00",
          quietHoursEnd: "09:00",
        });
        setLoading(false);
        return;
      }

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
        .select(
          "handle,display_name,profile_tags,is_public_profile,push_notifications_enabled,deadline_reminders_enabled,quiet_hours_enabled,quiet_hours_start,quiet_hours_end"
        )
        .eq("id", session.user.id)
        .single();

      if (!active) return;

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      const profileRow = data as {
        handle?: string | null;
        display_name?: string | null;
        profile_tags?: string[] | null;
        is_public_profile?: boolean | null;
        push_notifications_enabled?: boolean | null;
        deadline_reminders_enabled?: boolean | null;
        quiet_hours_enabled?: boolean | null;
        quiet_hours_start?: string | null;
        quiet_hours_end?: string | null;
      } | null;
      const handle = profileRow?.handle ?? null;
      const displayName = profileRow?.display_name ?? null;
      const profileTagsRow = profileRow?.profile_tags ?? [];
      const isPublic = profileRow?.is_public_profile ?? true;
      const pushEnabled = profileRow?.push_notifications_enabled ?? true;
      const deadlineRemindersEnabled = profileRow?.deadline_reminders_enabled ?? true;
      const quietHoursEnabled = profileRow?.quiet_hours_enabled ?? true;
      const quietHoursStart = profileRow?.quiet_hours_start ?? "22:00";
      const quietHoursEnd = profileRow?.quiet_hours_end ?? "09:00";
      if (handle) lastHandleRef.current = handle;
      setProfile({
        userId: session.user.id,
        email: session.user.email ?? null,
        handle,
        displayName,
        profileTags: profileTagsRow,
        isPublic,
        pushEnabled,
        deadlineRemindersEnabled,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
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
  }, [profile?.email, profile?.userId]);

  useEffect(() => {
    if (!profile) return;
    setDisplayNameInput(profile.displayName ?? "");
    setHandleInput(profile.handle ?? defaultHandle);
  }, [defaultHandle, profile?.displayName, profile?.handle, profile]);

  useEffect(() => {
    if (!profile) return;
    setQuietHoursStartInput(profile.quietHoursStart);
    setQuietHoursEndInput(profile.quietHoursEnd);
  }, [profile?.quietHoursStart, profile?.quietHoursEnd, profile]);

  useEffect(() => {
    if (!profile) return;
    setProfileTags(profile.profileTags ?? []);
  }, [profile?.profileTags, profile]);

  const isPublic = Boolean(profile?.isPublic);
  const publicProfilePath = useMemo(() => {
    if (!profile?.handle) return "";
    return `/u/${encodeURIComponent(profile.handle)}`;
  }, [profile?.handle]);
  const publicProfileUrl = origin && publicProfilePath ? `${origin}${publicProfilePath}` : publicProfilePath;

  const updateProfileRow = async (
    dbPatch: Record<string, unknown>,
    statePatch: Partial<ProfileState>
  ) => {
    if (!profile || saving) return false;
    setSaving(true);
    setError(null);

    if (authState?.isMock) {
      setProfile((prev) => (prev ? { ...prev, ...statePatch } : prev));
      setSaving(false);
      return true;
    }

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profileSettings.errors.unavailable"));
      setSaving(false);
      return false;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(dbPatch)
      .eq("id", profile.userId);

    if (updateError) {
      setError(updateError.message ?? t("profileSettings.errors.saveFailed"));
      setSaving(false);
      return false;
    }

    setProfile((prev) => (prev ? { ...prev, ...statePatch } : prev));
    setSaving(false);
    return true;
  };

  const handleToggle = async () => {
    if (!profile || saving) return;

    const nextPublic = !isPublic;
    const nextHandle = nextPublic
      ? lastHandleRef.current ?? profile.handle ?? defaultHandle
      : profile.handle;

    if (profile.handle) {
      lastHandleRef.current = profile.handle;
    }

    await updateProfileRow(
      { is_public_profile: nextPublic, handle: nextHandle },
      { handle: nextHandle, isPublic: nextPublic }
    );
  };

  const handleCopyLink = async () => {
    if (!publicProfileUrl) return;
    try {
      await navigator.clipboard.writeText(publicProfileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profileSettings.errors.copyFailed"));
    }
  };

  const togglePushNotifications = async () => {
    if (!profile) return;
    await updateProfileRow(
      { push_notifications_enabled: !profile.pushEnabled },
      { pushEnabled: !profile.pushEnabled }
    );
  };

  const toggleDeadlineReminders = async () => {
    if (!profile) return;
    await updateProfileRow(
      { deadline_reminders_enabled: !profile.deadlineRemindersEnabled },
      { deadlineRemindersEnabled: !profile.deadlineRemindersEnabled }
    );
  };

  const toggleQuietHours = async () => {
    if (!profile) return;
    await updateProfileRow(
      { quiet_hours_enabled: !profile.quietHoursEnabled },
      { quietHoursEnabled: !profile.quietHoursEnabled }
    );
  };

  const saveQuietHoursRange = async () => {
    if (!profile) return;
    await updateProfileRow(
      { quiet_hours_start: quietHoursStartInput, quiet_hours_end: quietHoursEndInput },
      { quietHoursStart: quietHoursStartInput, quietHoursEnd: quietHoursEndInput }
    );
  };

  const quietHoursRangeChanged =
    !!profile &&
    (quietHoursStartInput !== profile.quietHoursStart ||
      quietHoursEndInput !== profile.quietHoursEnd);
  const quietHoursRangeDisabled = !profile?.quietHoursEnabled;
  const normalizedDisplayName = displayNameInput.trim();
  const nextDisplayName =
    normalizedDisplayName.length > 0 ? normalizedDisplayName : null;
  const displayNameTooShort =
    nextDisplayName !== null && nextDisplayName.length < 2;
  const displayNameTooLong = nextDisplayName !== null && nextDisplayName.length > 40;
  const normalizedHandleInput = handleInput.trim().replace(/^@/, "");
  const nextHandle = normalizedHandleInput ? normalizedHandleInput.toLowerCase() : null;
  const handleMissing = !nextHandle;
  const identityChanged =
    !!profile &&
    (nextDisplayName !== (profile.displayName ?? null) ||
      nextHandle !== (profile.handle ?? null));
  const identityDisabled = loading || saving || !profile || !identityChanged;
  const normalizeTagValue = (value: string) => value.trim().toLowerCase();
  const normalizedProfileTags = useMemo(
    () => profileTags.map((tag) => normalizeTagValue(tag)).filter(Boolean),
    [profileTags]
  );
  const profileTagsSnapshot = useMemo(
    () => (profile?.profileTags ?? []).map((tag) => normalizeTagValue(tag)).filter(Boolean),
    [profile?.profileTags]
  );
  const tagsChanged =
    !!profile && normalizedProfileTags.join("|") !== profileTagsSnapshot.join("|");
  const tagsSaveDisabled = loading || saving || !profile || !tagsChanged;

  const applyTagChanges = (nextTags: string[]) => {
    setProfileTags(nextTags);
    setTagsError(null);
  };

  const addTagsFromInput = (rawInput: string) => {
    const candidates = rawInput
      .split(",")
      .map((tag) => normalizeTagValue(tag))
      .filter(Boolean);

    if (candidates.length === 0) {
      return;
    }

    let nextTags = [...normalizedProfileTags];
    for (const tag of candidates) {
      if (tag.length < minTagLength || tag.length > maxTagLength) {
        setTagsError(
          t("profileSettings.tagsErrorLength", {
            min: minTagLength,
            max: maxTagLength,
          })
        );
        return;
      }
      if (nextTags.includes(tag)) {
        continue;
      }
      if (nextTags.length >= maxTags) {
        setTagsError(t("profileSettings.tagsErrorCount", { count: maxTags }));
        return;
      }
      nextTags = [...nextTags, tag];
    }

    applyTagChanges(nextTags);
    setProfileTagsInput("");
  };

  const removeTag = (tagToRemove: string) => {
    applyTagChanges(normalizedProfileTags.filter((tag) => tag !== tagToRemove));
  };

  const saveTags = async () => {
    if (!profile) return;
    await updateProfileRow(
      { profile_tags: normalizedProfileTags },
      { profileTags: normalizedProfileTags }
    );
  };

  const saveIdentity = async () => {
    if (!profile) return;
    if (displayNameTooShort || displayNameTooLong) {
      setError(t("profileSettings.errors.displayNameLength"));
      return;
    }
    if (handleMissing) {
      setError(t("profileSettings.errors.handleRequired"));
      return;
    }
    await updateProfileRow(
      { display_name: nextDisplayName, handle: nextHandle },
      { displayName: nextDisplayName, handle: nextHandle }
    );
  };

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      {showTitle && (
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-200">
            {t("profileSettings.sectionLabel")}
          </div>
          <h2 className="text-lg font-semibold text-white">{t("profileSettings.title")}</h2>
        </div>
      )}

      <div className="mt-4 flex min-h-0 flex-col gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5">
          <button
            type="button"
            onClick={() => setOpenSection("identity")}
            aria-expanded={openSection === "identity"}
            className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:bg-white/10"
          >
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white">
                {t("profileSettings.identityLabel")}
              </div>
              <p className="text-xs text-slate-300">
                {t("profileSettings.identityDescription")}
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-200 transition ${
                openSection === "identity" ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              openSection === "identity" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div
              className={`overflow-hidden px-4 pb-4 transition-opacity duration-300 ${
                openSection === "identity" ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="space-y-3 pt-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="space-y-3">
                    <label className="flex flex-col gap-2 text-xs text-slate-300">
                      <span>{t("profileSettings.displayNameLabel")}</span>
                      <input
                        type="text"
                        value={displayNameInput}
                        onChange={(event) => setDisplayNameInput(event.target.value)}
                        placeholder={t("profileSettings.displayNamePlaceholder")}
                        maxLength={40}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a]"
                      />
                      <span className="text-[11px] text-slate-500">
                        {t("profileSettings.displayNameHelper")}
                      </span>
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-slate-300">
                      <span>{t("profileSettings.handleLabel")}</span>
                      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus-within:ring-2 focus-within:ring-emerald-300/40 focus-within:ring-offset-2 focus-within:ring-offset-[#0b0f1a]">
                        <span className="text-slate-400">@</span>
                        <input
                          type="text"
                          value={handleInput}
                          onChange={(event) => setHandleInput(event.target.value)}
                          placeholder={t("profileSettings.handlePlaceholder")}
                          className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus-visible:outline-none"
                        />
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {t("profileSettings.handleHelper")}
                      </span>
                    </label>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-500">
                        {displayNameTooShort || displayNameTooLong
                          ? t("profileSettings.displayNameError")
                          : handleMissing
                            ? t("profileSettings.handleError")
                            : " "}
                      </span>
                      <button
                        type="button"
                        onClick={saveIdentity}
                        disabled={identityDisabled}
                        className="h-9 cursor-pointer rounded-lg border border-white/10 px-4 text-xs font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {t("profileSettings.save")}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-white">
                      {t("profileSettings.publicLinkLabel")}
                    </div>
                    <p className="text-xs text-slate-300">
                      {t("profileSettings.publicLinkDescription")}
                    </p>
                  </div>
                  {publicProfilePath ? (
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 break-all rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200">
                        {publicProfileUrl}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={publicProfilePath}
                          target="_blank"
                          rel="noreferrer"
                          className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:scale-[0.98]"
                        >
                          {t("profileSettings.viewPublicProfile")}
                        </a>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:scale-[0.98]"
                        >
                          {copied ? t("profileSettings.copySuccess") : t("profileSettings.copyLink")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {!isPublic && publicProfilePath ? (
                    <p className="mt-3 text-xs text-slate-400">
                      {t("profileSettings.publicLinkPrivate")}
                    </p>
                  ) : null}
                </div>

                <SettingRow
                  title={
                    <button
                      type="button"
                      onClick={handleToggle}
                      disabled={loading || saving || !profile}
                      className={`-m-2 flex w-full flex-col items-start rounded-lg p-2 text-left transition ${
                        loading || saving || !profile
                          ? "cursor-not-allowed"
                          : "cursor-pointer hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:bg-white/10"
                      }`}
                    >
                      <div className="text-sm font-semibold text-white">
                        {t("profileSettings.publicLabel")}
                      </div>
                      <p className="text-xs text-slate-300">
                        {t("profileSettings.publicDescription")}
                      </p>
                    </button>
                  }
                  right={
                    <div className="flex items-center">
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
                        } ${
                          loading || saving || !profile
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:border-emerald-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:scale-[0.98]"
                        }`}
                      >
                        <span
                          className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition ${
                            isPublic ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  }
                >
                  {loading && (
                    <p className="mt-3 text-xs text-slate-400">{t("profileSettings.loading")}</p>
                  )}
                </SettingRow>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-white">
                        {t("profileSettings.tagsLabel")}
                      </div>
                      <p className="text-xs text-slate-300">
                        {t("profileSettings.tagsDescription")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {normalizedProfileTags.map((tag) => (
                        <span
                          key={tag}
                          tabIndex={0}
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-slate-200/90 transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a]"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="cursor-pointer rounded-full p-0.5 text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a]"
                            aria-label={t("profileSettings.tagsRemove", { tag })}
                          >
                            <X className="h-3 w-3" aria-hidden />
                          </button>
                        </span>
                      ))}
                      {normalizedProfileTags.length === 0 && (
                        <span className="text-xs text-slate-500">
                          {t("profileSettings.tagsEmpty")}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus-within:ring-2 focus-within:ring-emerald-300/40 focus-within:ring-offset-2 focus-within:ring-offset-[#0b0f1a]">
                          <input
                            type="text"
                            value={profileTagsInput}
                            onChange={(event) => {
                              setProfileTagsInput(event.target.value);
                              if (tagsError) setTagsError(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === ",") {
                                event.preventDefault();
                                addTagsFromInput(profileTagsInput);
                              }
                            }}
                            onBlur={() => addTagsFromInput(profileTagsInput)}
                            placeholder={t("profileSettings.tagsPlaceholder")}
                            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus-visible:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500">
                          {t("profileSettings.tagsHelper", {
                            count: normalizedProfileTags.length,
                            max: maxTags,
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={saveTags}
                          disabled={tagsSaveDisabled}
                          className="h-9 cursor-pointer rounded-lg border border-white/10 px-4 text-xs font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {t("profileSettings.save")}
                        </button>
                      </div>
                      {tagsError && (
                        <span className="text-[11px] text-red-200">{tagsError}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5">
          <button
            type="button"
            onClick={() => setOpenSection("notifications")}
            aria-expanded={openSection === "notifications"}
            className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:bg-white/10"
          >
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white">
                {t("profileSettings.notificationsLabel")}
              </div>
              <p className="text-xs text-slate-300">
                {t("profileSettings.notificationsDescription")}
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-200 transition ${
                openSection === "notifications" ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              openSection === "notifications" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div
              className={`overflow-hidden px-4 pb-4 transition-opacity duration-300 ${
                openSection === "notifications" ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="space-y-4 pt-3">
                <div className="flex items-start justify-between gap-4 sm:items-center">
                  <button
                    type="button"
                    onClick={togglePushNotifications}
                    disabled={loading || saving || !profile}
                    className={`-m-2 flex min-w-0 flex-1 flex-col items-start rounded-lg p-2 text-left transition ${
                      loading || saving || !profile
                        ? "cursor-not-allowed"
                        : "cursor-pointer hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:bg-white/10"
                    }`}
                  >
                    <div className="text-sm text-white">{t("profileSettings.pushLabel")}</div>
                    <p className="text-xs text-slate-400">
                      {t("profileSettings.pushDescription")}
                    </p>
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={profile?.pushEnabled ?? false}
                    onClick={togglePushNotifications}
                    disabled={loading || saving || !profile}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
                      profile?.pushEnabled
                        ? "border-emerald-300/50 bg-emerald-400/70"
                        : "border-white/20 bg-white/10"
                    } ${
                      loading || saving || !profile
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:border-emerald-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:scale-[0.98]"
                    }`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition ${
                        profile?.pushEnabled ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-start justify-between gap-4 sm:items-center">
                  <button
                    type="button"
                    onClick={toggleDeadlineReminders}
                    disabled={loading || saving || !profile}
                    className={`-m-2 flex min-w-0 flex-1 flex-col items-start rounded-lg p-2 text-left transition ${
                      loading || saving || !profile
                        ? "cursor-not-allowed"
                        : "cursor-pointer hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:bg-white/10"
                    }`}
                  >
                    <div className="text-sm text-white">
                      {t("profileSettings.deadlineLabel")}
                    </div>
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={profile?.deadlineRemindersEnabled ?? false}
                    onClick={toggleDeadlineReminders}
                    disabled={loading || saving || !profile}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
                      profile?.deadlineRemindersEnabled
                        ? "border-emerald-300/50 bg-emerald-400/70"
                        : "border-white/20 bg-white/10"
                    } ${
                      loading || saving || !profile
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:border-emerald-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:scale-[0.98]"
                    }`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition ${
                        profile?.deadlineRemindersEnabled ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4 sm:items-center">
                    <button
                      type="button"
                      onClick={toggleQuietHours}
                      disabled={loading || saving || !profile}
                      className={`-m-2 flex min-w-0 flex-1 flex-col items-start rounded-lg p-2 text-left transition ${
                        loading || saving || !profile
                          ? "cursor-not-allowed"
                          : "cursor-pointer hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:bg-white/10"
                      }`}
                    >
                      <div className="text-sm text-white">
                        {t("profileSettings.quietHoursLabel")}
                      </div>
                      <p className="text-xs text-slate-400">
                        {t("profileSettings.quietHoursDescription")}
                      </p>
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={profile?.quietHoursEnabled ?? false}
                      onClick={toggleQuietHours}
                      disabled={loading || saving || !profile}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
                        profile?.quietHoursEnabled
                          ? "border-emerald-300/50 bg-emerald-400/70"
                          : "border-white/20 bg-white/10"
                      } ${
                        loading || saving || !profile
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer hover:border-emerald-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:scale-[0.98]"
                      }`}
                    >
                      <span
                        className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition ${
                          profile?.quietHoursEnabled ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`flex flex-wrap items-center gap-3 ${
                        quietHoursRangeDisabled ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      <span className="sr-only">{t("profileSettings.quietHoursRangeLabel")}</span>
                      <TimePicker
                        value={quietHoursStartInput}
                        onChange={setQuietHoursStartInput}
                        disabled={!profile?.quietHoursEnabled || loading || saving}
                        ariaLabel={t("profileSettings.quietHoursRangeLabel")}
                        className="w-[150px]"
                        buttonClassName="h-9 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
                      />
                      <span className="inline-flex h-9 items-center text-xs text-slate-400">→</span>
                      <TimePicker
                        value={quietHoursEndInput}
                        onChange={setQuietHoursEndInput}
                        disabled={!profile?.quietHoursEnabled || loading || saving}
                        ariaLabel={t("profileSettings.quietHoursRangeLabel")}
                        className="w-[150px]"
                        buttonClassName="h-9 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
                      />
                      <button
                        type="button"
                        onClick={saveQuietHoursRange}
                        disabled={
                          loading ||
                          saving ||
                          !profile ||
                          !profile?.quietHoursEnabled ||
                          !quietHoursRangeChanged
                        }
                        className="h-9 cursor-pointer rounded-lg border border-white/10 px-4 text-xs font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {t("profileSettings.save")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="mt-4 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={async () => {
              setLogoutError(null);
              if (authState?.isMock) {
                return;
              }
              try {
                const supabase = requireSupabase();
                const { error: signOutError } = await supabase.auth.signOut();
                if (signOutError) {
                  setLogoutError(signOutError.message);
                }
              } catch (err) {
                setLogoutError(
                  err instanceof Error
                    ? err.message
                    : t("profileSettings.errors.unavailable")
                );
              }
            }}
            className="w-full cursor-pointer rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-emerald-300/50 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:scale-[0.98]"
          >
            {t("nav.logout")}
          </button>
          {logoutError && (
            <div className="mt-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {logoutError}
            </div>
          )}
        </div>
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {variant === "icon" ? (
        <Tooltip label={t("profileSettings.buttonLabel")} placement="top-right">
          <SheetTrigger asChild>
            <IconButton
              ariaLabel={t("profileSettings.buttonLabel")}
              icon={<UserRound className="h-4 w-4" aria-hidden />}
              className={className}
            />
          </SheetTrigger>
        </Tooltip>
      ) : (
        <SheetTrigger asChild>
          <button
            type="button"
            className={`w-full cursor-pointer rounded-xl border border-white/10 px-3 py-2 text-left text-white transition hover:border-emerald-300/50 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:scale-[0.98] ${className}`}
          >
            {t("profileSettings.buttonLabel")}
          </button>
        </SheetTrigger>
      )}
      <SheetPortal>
        <SheetOverlay />
        <SheetContent className="flex flex-col md:w-[360px] lg:right-auto lg:left-1/2 lg:top-1/2 lg:h-[90dvh] lg:max-h-[90dvh] lg:w-[840px] lg:max-w-[90vw] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl lg:border lg:border-white/10 lg:border-l-0 lg:p-10 lg:shadow-2xl lg:shadow-black/60 lg:overflow-y-auto">
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
                className="cursor-pointer rounded-lg border border-white/10 p-2 text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] active:scale-[0.98]"
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

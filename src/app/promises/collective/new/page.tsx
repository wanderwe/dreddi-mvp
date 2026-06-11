"use client";

import { LocalizedLink } from "@/app/components/LocalizedLink";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";

type SearchUser = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function NewCollectiveAgreementPage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [conditionText, setConditionText] = useState("");
  const [showCondition, setShowCondition] = useState(false);
  const [dueAt, setDueAt] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [isImportant, setIsImportant] = useState(false);
  const [isPublicProfile, setIsPublicProfile] = useState<boolean | null>(null);

  const [participantQuery, setParticipantQuery] = useState("");
  const [participantResults, setParticipantResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<SearchUser[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const shouldShowCondition = showCondition || conditionText.trim().length > 0;

  useEffect(() => {
    let active = true;

    const ensureSession = async () => {
      let supabase;
      try {
        supabase = requireSupabase();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : String(err));
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      if (!sessionData.session) {
        router.replace(localizeLoginPath(localizePath("/promises/collective/new", locale), locale));
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_public_profile")
        .eq("id", sessionData.session.user.id)
        .maybeSingle();

      if (!active) return;
      setIsPublicProfile(profileData?.is_public_profile ?? true);
    };

    void ensureSession();

    return () => {
      active = false;
    };
  }, [locale, router]);

  useEffect(() => {
    if (participantQuery.trim().length < 2) {
      setParticipantResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const supabase = requireSupabase();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          if (!active) return;
          setParticipantResults([]);
          return;
        }

        const res = await fetch(`/api/user-search?q=${encodeURIComponent(participantQuery.trim())}`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await res.json().catch(() => null)) as { users?: SearchUser[] } | null;
        if (!active) return;
        const selectedIds = new Set(selectedParticipants.map((p) => p.id));
        setParticipantResults((payload?.users ?? []).filter((u) => !selectedIds.has(u.id)));
      } catch {
        if (!active) return;
        setParticipantResults([]);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [participantQuery, selectedParticipants]);

  const addParticipant = (user: SearchUser) => {
    setSelectedParticipants((prev) => (prev.some((p) => p.id === user.id) ? prev : [...prev, user]));
    setParticipantQuery("");
    setParticipantResults([]);
  };

  const removeParticipant = (id: string) => {
    setSelectedParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  async function createCollectiveAgreement() {
    setError(null);
    setSessionExpired(false);

    if (!title.trim()) {
      setError(t("collectiveAgreements.new.errors.titleRequired"));
      return;
    }

    if (selectedParticipants.length === 0) {
      setError(t("collectiveAgreements.new.errors.participantsRequired"));
      return;
    }

    setBusy(true);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setBusy(false);
      setSessionExpired(true);
      setError("Session expired. Please sign in again.");
      return;
    }

    const shouldMakePublic = visibility === "public" && isPublicProfile;
    const dueAtIso = dueAt ? new Date(dueAt).toISOString() : null;

    const payload = {
      title: title.trim(),
      details: details.trim() || null,
      conditionText: conditionText.trim() || null,
      dueAt: dueAtIso,
      visibility: shouldMakePublic ? "public" : "private",
      isImportant,
      participantUserIds: selectedParticipants.map((p) => p.id),
    };

    let res: Response;
    try {
      res = await fetch("/api/promises/collective/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      setBusy(false);
      setError(t("collectiveAgreements.new.errors.network"));
      return;
    }

    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setSessionExpired(true);
        setError("Session expired. Please sign in again.");
        return;
      }
      setError(body.error ?? t("collectiveAgreements.new.errors.createFailed"));
      return;
    }

    const body = (await res.json().catch(() => null)) as { id?: string } | null;
    if (!body?.id) {
      setError(t("collectiveAgreements.new.errors.createFailed"));
      return;
    }

    router.push(localizePath(`/promises/collective/${body.id}`, locale));
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(82,193,106,0.22),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_55%_65%,rgba(34,55,93,0.18),transparent_40%)]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 md:py-10">
        <div className="w-full max-w-2xl space-y-5 rounded-3xl border border-white/10 bg-black/40 p-5 pb-28 shadow-2xl shadow-black/40 backdrop-blur sm:p-8 sm:pb-8">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
              {t("collectiveAgreements.eyebrow")}
            </p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              {t("collectiveAgreements.new.title")}
            </h1>
            <p className="text-sm text-slate-300">{t("collectiveAgreements.new.subtitle")}</p>
          </div>

          <div className="grid items-start gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200 sm:col-span-2">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("collectiveAgreements.new.fields.title")}
              </span>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                placeholder={t("collectiveAgreements.new.placeholders.title")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200 sm:col-span-2">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("collectiveAgreements.new.fields.details")}
              </span>
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                placeholder={t("collectiveAgreements.new.placeholders.details")}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
              {!shouldShowCondition && (
                <div className="flex -mt-1">
                  <button
                    type="button"
                    onClick={() => setShowCondition(true)}
                    className="cursor-pointer text-xs font-semibold text-slate-300 transition hover:text-emerald-100"
                  >
                    {t("collectiveAgreements.new.actions.addCondition")}
                  </button>
                </div>
              )}
            </label>

            {shouldShowCondition && (
              <label className="space-y-2 text-sm text-slate-200 sm:col-span-2">
                <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                  {t("collectiveAgreements.new.fields.condition")}
                </span>
                <textarea
                  className="min-h-[80px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                  placeholder={t("collectiveAgreements.new.placeholders.condition")}
                  value={conditionText}
                  onChange={(e) => setConditionText(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setConditionText("");
                      setShowCondition(false);
                    }}
                    className="cursor-pointer text-xs font-semibold text-slate-300 transition hover:text-emerald-100"
                  >
                    {t("collectiveAgreements.new.actions.removeCondition")}
                  </button>
                </div>
              </label>
            )}

            <label className="space-y-2 text-sm text-slate-200">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("collectiveAgreements.new.fields.dueDate")}
              </span>
              <input
                type="datetime-local"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </label>

            <div className="space-y-2 text-sm text-slate-200 sm:col-span-2">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("collectiveAgreements.new.fields.participants")}
              </span>

              {selectedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedParticipants.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-100"
                    >
                      {p.display_name ?? `@${p.handle}`} · @{p.handle}
                      <button
                        type="button"
                        onClick={() => removeParticipant(p.id)}
                        aria-label={t("collectiveAgreements.new.actions.removeParticipant")}
                        className="cursor-pointer rounded-full border border-emerald-300/40 p-0.5 text-emerald-100 transition hover:bg-white/10"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <input
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                  placeholder={t("collectiveAgreements.new.placeholders.participantSearch")}
                  value={participantQuery}
                  onChange={(e) => setParticipantQuery(e.target.value)}
                />
                {participantQuery.trim().length >= 2 && (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 shadow-xl shadow-black/40">
                    {isSearching && (
                      <p className="px-3 py-2 text-xs text-slate-400">
                        {t("collectiveAgreements.new.search.searching")}
                      </p>
                    )}
                    {!isSearching && participantResults.length === 0 && (
                      <p className="px-3 py-3 text-xs text-slate-400">
                        {t("collectiveAgreements.new.search.noResults")}
                      </p>
                    )}
                    {!isSearching &&
                      participantResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => addParticipant(user)}
                          className="flex w-full cursor-pointer items-center gap-3 border-b border-white/5 px-3 py-2 text-left last:border-b-0 hover:bg-white/5"
                        >
                          <div className="h-8 w-8 overflow-hidden rounded-full bg-white/10">
                            {user.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-slate-300">
                                @{user.handle.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {user.display_name ?? `@${user.handle}`}
                            </p>
                            <p className="truncate text-xs text-slate-400">@{user.handle}</p>
                          </div>
                          <span className="rounded-full border border-emerald-300/40 px-2 py-0.5 text-[10px] text-emerald-100">
                            {t("collectiveAgreements.new.search.inDreddi")}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">
                    {t("collectiveAgreements.new.settings.important.toggle")}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {t("collectiveAgreements.new.settings.important.helper")}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isImportant}
                  onClick={() => setIsImportant((prev) => !prev)}
                  className={clsx(
                    "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border transition",
                    isImportant
                      ? "border-emerald-300/50 bg-emerald-400/70 hover:bg-emerald-400/80"
                      : "border-white/20 bg-white/10 hover:bg-white/20"
                  )}
                >
                  <span
                    className={clsx(
                      "inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition",
                      isImportant ? "translate-x-5" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">
                    {t("collectiveAgreements.new.settings.visibility.label")}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {t("collectiveAgreements.new.settings.visibility.helper")}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={visibility === "public"}
                  onClick={() => setVisibility((prev) => (prev === "public" ? "private" : "public"))}
                  className={clsx(
                    "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border transition",
                    visibility === "public"
                      ? "border-emerald-300/50 bg-emerald-400/70 hover:bg-emerald-400/80"
                      : "border-white/20 bg-white/10 hover:bg-white/20"
                  )}
                >
                  <span
                    className={clsx(
                      "inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition",
                      visibility === "public" ? "translate-x-5" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={createCollectiveAgreement}
              disabled={busy || !title.trim()}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
            >
              {busy
                ? t("collectiveAgreements.new.creating")
                : t("collectiveAgreements.new.submit")}
            </button>

            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                <p>{error}</p>
                {sessionExpired && (
                  <LocalizedLink
                    href={localizeLoginPath(localizePath("/promises/collective/new", locale), locale)}
                    className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-emerald-200 hover:text-emerald-100"
                  >
                    Sign in again →
                  </LocalizedLink>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

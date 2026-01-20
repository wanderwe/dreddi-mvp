"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";

export default function NewPromisePage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [conditionText, setConditionText] = useState("");
  const [showCondition, setShowCondition] = useState(false);
  const [counterparty, setCounterparty] = useState("");
  const [dueAt, setDueAt] = useState<Date | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const defaultDueTime = { hour: 18, minute: 0 };
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [popoverStyles, setPopoverStyles] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "top" | "bottom";
  } | null>(null);
  const [executor, setExecutor] = useState<"me" | "other">("me");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [isPublicDeal, setIsPublicDeal] = useState(false);
  const [groupDealsEnabled, setGroupDealsEnabled] = useState(false);
  const [acceptanceMode, setAcceptanceMode] = useState<"all" | "threshold">("all");
  const [acceptanceThreshold, setAcceptanceThreshold] = useState("");
  const [participantsInput, setParticipantsInput] = useState("");
  const shouldShowCondition = showCondition || conditionText.trim().length > 0;

  const supabaseErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : "Authentication is unavailable in this preview.";

  const dueDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }),
    [locale]
  );
  const dueTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }),
    [locale]
  );

  const formattedDueAt = useMemo(
    () =>
      dueAt
        ? `${dueDateFormatter.format(dueAt)}, ${dueTimeFormatter.format(dueAt)}`
        : t("promises.new.placeholders.dueDate"),
    [dueAt, dueDateFormatter, dueTimeFormatter, t]
  );

  const normalizedDueAt = useMemo(() => {
    if (!dueAt) return null;
    const normalized = new Date(dueAt);
    normalized.setSeconds(0, 0);
    return normalized;
  }, [dueAt]);

  const participantList = useMemo(() => {
    return participantsInput
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }, [participantsInput]);

  const isGroupDeal =
    groupDealsEnabled && (acceptanceMode === "threshold" || participantList.length > 1);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });
    const days: Date[] = [];
    let current = start;
    while (current <= end) {
      days.push(current);
      current = addDays(current, 1);
    }
    return days;
  }, [calendarMonth]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => format(addDays(start, index), "EE"));
  }, []);

  const timePresets = [
    { label: "09:00", hour: 9, minute: 0 },
    { label: "12:00", hour: 12, minute: 0 },
    { label: "18:00", hour: 18, minute: 0 },
    { label: "23:59", hour: 23, minute: 59 },
  ];

  const timeOptions = useMemo(() => {
    const options: Array<{ label: string; hour: number; minute: number }> = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (let minute = 0; minute < 60; minute += 30) {
        const label = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        options.push({ label, hour, minute });
      }
    }
    return options;
  }, []);

  const applyTimeChange = (hour: number, minute: number) => {
    if (!dueAt) return;
    const next = new Date(dueAt);
    next.setHours(hour, minute, 0, 0);
    setDueAt(next);
  };

  const calendarPopover =
    isCalendarOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={popoverRef}
            data-placement={popoverStyles?.placement ?? "bottom"}
            style={{
              top: popoverStyles?.top ?? 0,
              left: popoverStyles?.left ?? 0,
              width: popoverStyles?.width ?? 320,
            }}
            className={clsx(
              "fixed z-50 rounded-2xl border border-white/10 bg-slate-950/95 p-4 text-sm text-slate-100 shadow-2xl shadow-black/60 backdrop-blur",
              !popoverStyles && "pointer-events-none opacity-0"
            )}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCalendarMonth((prev) => subMonths(prev, 1))}
                className="rounded-lg border border-white/10 p-2 text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <div className="text-sm font-semibold text-slate-100">
                {format(calendarMonth, "MMMM yyyy")}
              </div>
              <button
                type="button"
                onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
                className="rounded-lg border border-white/10 p-2 text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.2em] text-slate-500">
              {weekDays.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((day) => {
                const isSelected = !!dueAt && isSameDay(day, dueAt);
                const inMonth = isSameMonth(day, calendarMonth);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      const next = new Date(day);
                      if (dueAt) {
                        next.setHours(dueAt.getHours(), dueAt.getMinutes(), 0, 0);
                      } else {
                        next.setHours(defaultDueTime.hour, defaultDueTime.minute, 0, 0);
                      }
                      setDueAt(next);
                      setIsCalendarOpen(false);
                    }}
                    className={clsx(
                      "flex h-9 w-9 items-center justify-center rounded-full text-sm transition",
                      isSelected
                        ? "bg-emerald-400/90 text-slate-950"
                        : "text-slate-200 hover:bg-white/10",
                      !inMonth && "text-slate-600",
                      isToday(day) && !isSelected && "border border-emerald-400/40"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )
      : null;

  const timePicker =
    isTimePickerOpen && dueAt && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label={t("promises.new.actions.closeTimePicker")}
              onClick={() => setIsTimePickerOpen(false)}
            />
            <div className="relative w-full max-w-md rounded-t-3xl border border-white/10 bg-slate-950/95 p-5 text-slate-100 shadow-2xl shadow-black/60 backdrop-blur sm:rounded-3xl">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-100">
                  {t("promises.new.actions.selectTime")}
                </div>
                <button
                  type="button"
                  onClick={() => setIsTimePickerOpen(false)}
                  aria-label={t("promises.new.actions.closeTimePicker")}
                  className="rounded-full border border-white/10 p-1 text-slate-300 transition hover:border-emerald-300/40 hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {timePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      applyTimeChange(preset.hour, preset.minute);
                      setIsTimePickerOpen(false);
                    }}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/60 hover:text-emerald-100"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-2">
                <div className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-4">
                  {timeOptions.map((option) => {
                    const isSelected =
                      dueAt.getHours() === option.hour && dueAt.getMinutes() === option.minute;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => {
                          applyTimeChange(option.hour, option.minute);
                          setIsTimePickerOpen(false);
                        }}
                        className={clsx(
                          "rounded-xl border px-2 py-2 text-sm transition",
                          isSelected
                            ? "border-emerald-300/70 bg-emerald-400/20 text-emerald-100"
                            : "border-white/10 text-slate-200 hover:border-emerald-300/50 hover:text-emerald-100"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  useEffect(() => {
    if (!isCalendarOpen) return;
    setCalendarMonth(startOfMonth(dueAt ?? new Date()));
  }, [dueAt, isCalendarOpen]);

  useEffect(() => {
    if (!isCalendarOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setIsCalendarOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsCalendarOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isCalendarOpen, calendarMonth]);

  useEffect(() => {
    if (!isTimePickerOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsTimePickerOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [isTimePickerOpen]);

  useEffect(() => {
    if (!dueAt) setIsTimePickerOpen(false);
  }, [dueAt]);

  useEffect(() => {
    if (!isCalendarOpen) {
      setPopoverStyles(null);
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current || !popoverRef.current) return;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const viewportPadding = 8;
      const spacing = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const maxWidth = Math.max(0, viewportWidth - viewportPadding * 2);
      const desiredWidth = Math.max(
        triggerRect.width,
        Math.min(320, maxWidth)
      );
      const width = Math.min(desiredWidth, maxWidth);

      let top = triggerRect.bottom + spacing;
      let placement: "top" | "bottom" = "bottom";
      if (top + popoverRect.height > viewportHeight - viewportPadding) {
        const nextTop = triggerRect.top - spacing - popoverRect.height;
        if (nextTop >= viewportPadding) {
          top = nextTop;
          placement = "top";
        } else {
          top = Math.max(viewportPadding, viewportHeight - popoverRect.height - viewportPadding);
        }
      }

      let left = triggerRect.left;
      if (left + width > viewportWidth - viewportPadding) {
        left = viewportWidth - viewportPadding - width;
      }
      if (left < viewportPadding) {
        left = viewportPadding;
      }

      setPopoverStyles({ top, left, width, placement });
    };

    updatePosition();
    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isCalendarOpen, calendarMonth]);

  useEffect(() => {
    let active = true;

    const ensureSession = async () => {
      let supabase;
      try {
        supabase = requireSupabase();
      } catch (err) {
        if (active) {
          setError(supabaseErrorMessage(err));
        }
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      if (!sessionData.session) {
        router.replace(`/login?next=${encodeURIComponent("/promises/new")}`);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_public_profile")
        .eq("id", sessionData.session.user.id)
        .maybeSingle();

      if (!active) return;
      setIsPublicProfile(profileData?.is_public_profile ?? true);

      try {
        const res = await fetch("/api/feature-flags", {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });
        if (!active) return;
        if (res.ok) {
          const flags = (await res.json()) as { groupDealsEnabled?: boolean };
          setGroupDealsEnabled(Boolean(flags.groupDealsEnabled));
        } else {
          setGroupDealsEnabled(false);
        }
      } catch {
        if (!active) return;
        setGroupDealsEnabled(false);
      }
    };

    void ensureSession();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!isPublicProfile) {
      setIsPublicDeal(false);
    }
  }, [isPublicProfile]);

  async function createPromise() {
    setBusy(true);
    setError(null);
    setSessionExpired(false);

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setBusy(false);
      setError(supabaseErrorMessage(err));
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session) {
      setBusy(false);
      setSessionExpired(true);
      setError("Session expired. Please sign in again to create this deal.");
      return;
    }

    const counterpartyContact = counterparty.trim();
    const thresholdNumber = acceptanceThreshold ? Number(acceptanceThreshold) : null;

    if (!isGroupDeal && !counterpartyContact) {
      setBusy(false);
      setError(t("promises.new.errors.counterpartyRequired"));
      return;
    }

    if (isGroupDeal && participantList.length < 1) {
      setBusy(false);
      setError(t("promises.new.errors.participantsRequired"));
      return;
    }

    if (isGroupDeal && acceptanceMode === "threshold") {
      if (!thresholdNumber || thresholdNumber < 1) {
        setBusy(false);
        setError(t("promises.new.errors.thresholdRequired"));
        return;
      }
      if (thresholdNumber > participantList.length) {
        setBusy(false);
        setError(t("promises.new.errors.thresholdTooHigh"));
        return;
      }
    }

    const shouldRequestPublic = isPublicDeal && isPublicProfile;
    const payload = {
      title: title.trim(),
      details: details.trim() || null,
      conditionText: conditionText.trim() || null,
      counterpartyContact: isGroupDeal ? null : counterpartyContact,
      dueAt: normalizedDueAt ? normalizedDueAt.toISOString() : null,
      executor,
      visibility: shouldRequestPublic ? "public" : "private",
      acceptanceMode: groupDealsEnabled ? acceptanceMode : undefined,
      acceptanceThreshold:
        isGroupDeal && acceptanceMode === "threshold" ? thresholdNumber : null,
      participants: isGroupDeal ? participantList : [],
    };

    let res: Response;
    try {
      res = await fetch("/api/promises/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      setBusy(false);
      setError(t("promises.new.errors.network"));
      return;
    }

    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[promises:new] Missing/expired session while creating deal");
        }
        setSessionExpired(true);
        setError("Session expired. Please sign in again to create this deal.");
        return;
      }
      setError(body.error ?? t("promises.new.errors.createFailed"));
      return;
    }

    const body = (await res.json().catch(() => null)) as { id?: string } | null;

    if (!body?.id) {
      setError(t("promises.new.errors.createFailed"));
      return;
    }

    router.push(`/promises/${body.id}`);
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      {calendarPopover}
      {timePicker}
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(82,193,106,0.22),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_55%_65%,rgba(34,55,93,0.18),transparent_40%)]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-6 rounded-3xl border border-white/10 bg-black/40 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.new.eyebrow")}
              </p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                {t("promises.new.title")}
              </h1>
              <p className="text-sm text-slate-300">{t("promises.new.subtitle")}</p>
            </div>
          </div>

          <div className="grid items-start gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-sm text-slate-200 sm:col-span-2">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.new.fields.executor")}
              </span>
              <div className="flex w-full rounded-2xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setExecutor("me")}
                  className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    executor === "me"
                      ? "bg-emerald-400/90 text-slate-950 shadow shadow-emerald-500/20"
                      : "text-slate-200 hover:text-emerald-100"
                  }`}
                >
                  {t("promises.new.executor.me")}
                </button>
                <button
                  type="button"
                  onClick={() => setExecutor("other")}
                  className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    executor === "other"
                      ? "bg-emerald-400/90 text-slate-950 shadow shadow-emerald-500/20"
                      : "text-slate-200 hover:text-emerald-100"
                  }`}
                >
                  {t("promises.new.executor.other")}
                </button>
              </div>
            </div>

            <label className="space-y-2 text-sm text-slate-200 sm:col-span-2">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.new.fields.title")}
              </span>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                placeholder={t("promises.new.placeholders.title")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label className="space-y-2 text-sm text-slate-200 sm:col-span-2">
              <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.new.fields.details")}
              </span>
              <textarea
                className="min-h-[130px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                placeholder={t("promises.new.placeholders.details")}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </label>

            {!shouldShowCondition ? (
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowCondition(true)}
                  className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300/40 hover:text-emerald-100"
                >
                  {t("promises.new.actions.addCondition")}
                </button>
              </div>
            ) : (
              <label className="space-y-2 text-sm text-slate-200 sm:col-span-2">
                <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                  {t("promises.new.fields.condition")}
                </span>
                <textarea
                  className="min-h-[90px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                  placeholder={t("promises.new.placeholders.condition")}
                  value={conditionText}
                  onChange={(e) => setConditionText(e.target.value)}
                />
              </label>
            )}

            <div className="sm:col-span-2">
              <div className="grid items-start gap-4 sm:grid-cols-2">
                {executor && (
                  <div className="text-sm text-slate-200">
                    <label className="block">
                      <span className="mb-2 block min-h-[2rem] text-xs uppercase tracking-[0.2em] text-emerald-200">
                        {t("promises.new.fields.counterparty")}
                      </span>
                      <input
                        id="counterparty"
                        aria-describedby="counterparty-helper"
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm leading-5 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                        placeholder={
                          executor === "me"
                            ? t("promises.new.placeholders.counterpartyMe")
                            : t("promises.new.placeholders.counterpartyOther")
                        }
                        value={counterparty}
                        onChange={(e) => setCounterparty(e.target.value)}
                      />
                    </label>
                  </div>
                )}

                <div className="text-sm text-slate-200">
                  <span className="mb-2 block min-h-[2rem] text-xs uppercase tracking-[0.2em] text-emerald-200">
                    {t("promises.new.fields.dueDate")}
                  </span>
                  <div className="relative flex flex-col sm:flex-row sm:items-center">
                    <button
                      type="button"
                      ref={triggerRef}
                      onClick={() => setIsCalendarOpen((open) => !open)}
                      aria-expanded={isCalendarOpen}
                      aria-label={t("promises.new.fields.dueDate")}
                      className="flex h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 pr-10 text-left text-sm leading-5 text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/10 sm:flex-1"
                    >
                      <CalendarIcon className="h-4 w-4 text-emerald-200" aria-hidden />
                      <span
                        className={clsx("flex-1", dueAt ? "text-slate-100" : "text-slate-500")}
                      >
                        {formattedDueAt}
                      </span>
                    </button>
                    {dueAt && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDueAt(undefined);
                        }}
                        aria-label={t("promises.new.actions.clearDate")}
                        title={t("promises.new.actions.clearDate")}
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-transparent p-1 text-slate-400 transition hover:border-white/10 hover:bg-white/10 hover:text-slate-100"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                  </div>
                  {dueAt && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                        {dueTimeFormatter.format(dueAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsTimePickerOpen(true)}
                        className="text-xs font-semibold text-emerald-200 transition hover:text-emerald-100"
                      >
                        {t("promises.new.actions.changeTime")}
                      </button>
                    </div>
                  )}
                </div>
            </div>

            {executor && (
              <p
                id="counterparty-helper"
                className="mt-2 text-sm leading-relaxed text-slate-400"
              >
                {t("promises.new.fields.counterpartyHelper")}
              </p>
            )}

            {groupDealsEnabled && (
              <details className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  {t("promises.new.advanced.label")}
                </summary>
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                      {t("promises.new.group.acceptanceMode")}
                    </span>
                    <div className="flex w-full rounded-2xl border border-white/10 bg-white/5 p-1">
                      <button
                        type="button"
                        onClick={() => setAcceptanceMode("all")}
                        className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                          acceptanceMode === "all"
                            ? "bg-emerald-400/90 text-slate-950 shadow shadow-emerald-500/20"
                            : "text-slate-200 hover:text-emerald-100"
                        }`}
                      >
                        {t("promises.new.group.acceptanceAll")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAcceptanceMode("threshold")}
                        className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                          acceptanceMode === "threshold"
                            ? "bg-emerald-400/90 text-slate-950 shadow shadow-emerald-500/20"
                            : "text-slate-200 hover:text-emerald-100"
                        }`}
                      >
                        {t("promises.new.group.acceptanceThreshold")}
                      </button>
                    </div>
                  </div>

                  {acceptanceMode === "threshold" && (
                    <label className="space-y-2 text-sm text-slate-200">
                      <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                        {t("promises.new.group.thresholdLabel")}
                      </span>
                      <input
                        type="number"
                        min={1}
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm leading-5 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                        placeholder={t("promises.new.group.thresholdPlaceholder")}
                        value={acceptanceThreshold}
                        onChange={(e) => setAcceptanceThreshold(e.target.value)}
                      />
                    </label>
                  )}

                  <label className="space-y-2 text-sm text-slate-200">
                    <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                      {t("promises.new.group.participantsLabel")}
                    </span>
                    <textarea
                      className="min-h-[90px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                      placeholder={t("promises.new.group.participantsPlaceholder")}
                      value={participantsInput}
                      onChange={(e) => setParticipantsInput(e.target.value)}
                    />
                    <p className="text-xs text-slate-400">
                      {t("promises.new.group.participantsHelper")}
                    </p>
                  </label>
                </div>
              </details>
            )}

            {isPublicProfile && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-sm font-semibold text-white">
                      {t("promises.new.publicRequest.label")}
                    </div>
                    <p className="text-xs text-slate-400">
                      {t("promises.new.publicRequest.helper")}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPublicDeal}
                    aria-label={t("promises.new.publicRequest.label")}
                    onClick={() => setIsPublicDeal((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition ${
                      isPublicDeal
                        ? "border-emerald-300/50 bg-emerald-400/70"
                        : "border-white/20 bg-white/10"
                    } hover:border-emerald-300/60`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition ${
                        isPublicDeal ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={createPromise}
              disabled={
                busy ||
                !title.trim() ||
                (isGroupDeal ? participantList.length < 1 : !counterparty.trim())
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 disabled:translate-y-0 disabled:opacity-60"
            >
              {busy ? t("promises.new.creating") : t("promises.new.submit")}
            </button>

            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                <p>{error}</p>
                {sessionExpired && (
                  <Link
                    href={`/login?next=${encodeURIComponent("/promises/new")}`}
                    className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 hover:text-emerald-100"
                  >
                    Sign in again →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

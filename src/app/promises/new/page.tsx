"use client";

import { LocalizedLink } from "@/app/components/LocalizedLink";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { localizeLoginPath, localizePath } from "@/lib/i18n/routing";
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
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { requireSupabase } from "@/lib/supabaseClient";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { getPromiseLabels } from "@/lib/promiseLabels";
import { Tooltip } from "@/app/components/ui/Tooltip";
import { getPromiseInviteStatus } from "@/lib/promiseAcceptance";
import {
  generateDealPrediction,
  type PredictionInput,
  type PredictionReasonKey,
} from "@/lib/prediction/dealPrediction";

export default function NewPromisePage() {
  const PREFILL_MAX_RETRIES = 20;
  const DEAL_DRAFT_STORAGE_KEY = "dreddi:new-promise-draft";
  const ENABLE_GROUP_SELECTION = false;
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPromiseId = searchParams?.get("fromPromise");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [conditionText, setConditionText] = useState("");
  const [showCondition, setShowCondition] = useState(false);
  const [counterpartyQuery, setCounterpartyQuery] = useState("");
  const [selectedCounterparty, setSelectedCounterparty] = useState<{
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const [counterpartyResults, setCounterpartyResults] = useState<
    Array<{
      id: string;
      handle: string;
      display_name: string | null;
      avatar_url: string | null;
    }>
  >([]);
  const [isCounterpartySearching, setIsCounterpartySearching] = useState(false);
  const [groups, setGroups] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isGroupsLoading, setIsGroupsLoading] = useState(true);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [dueAt, setDueAt] = useState<Date | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const defaultDueTime = { hour: 18, minute: 0 };
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const groupMenuRef = useRef<HTMLDivElement | null>(null);
  const groupButtonRef = useRef<HTMLButtonElement | null>(null);
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
  const [isPublicProfile, setIsPublicProfile] = useState<boolean | null>(null);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [isImportant, setIsImportant] = useState(false);
  const [showCounterpartyDropdown, setShowCounterpartyDropdown] = useState(false);
  const [counterpartyActiveIndex, setCounterpartyActiveIndex] = useState(0);
  const shouldShowCondition = showCondition || conditionText.trim().length > 0;
  const promiseLabels = useMemo(() => getPromiseLabels(t), [t]);
  const prefillResolved = useRef(false);
  const draftHydrated = useRef(false);
  const [prefillRetryTick, setPrefillRetryTick] = useState(0);
  const [showPrefillConfirmation, setShowPrefillConfirmation] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [predictionInput, setPredictionInput] = useState<PredictionInput>({});
  const [isPredictionExpanded, setIsPredictionExpanded] = useState(false);

  const handleRemoveCondition = () => {
    setConditionText("");
    setShowCondition(false);
  };

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
  const selectedGroupLabel = useMemo(() => {
    if (!selectedGroupId) return t("promises.new.group.none");
    return groups.find((group) => group.id === selectedGroupId)?.title ?? t("promises.new.group.none");
  }, [groups, selectedGroupId, t]);

  const predictionReady = title.trim().length > 0;

  const reasonText = useMemo(
    () =>
      ({
        strong_fulfillment_history: t("promises.new.prediction.reasons.strongFulfillmentHistory"),
        low_fulfillment_history: t("promises.new.prediction.reasons.lowFulfillmentHistory"),
        strong_completion_history: t("promises.new.prediction.reasons.strongCompletionHistory"),
        low_completion_history: t("promises.new.prediction.reasons.lowCompletionHistory"),
        high_dispute_rate: t("promises.new.prediction.reasons.highDisputeRate"),
        limited_history_uncertain: t("promises.new.prediction.reasons.limitedHistory"),
        deep_shared_history: t("promises.new.prediction.reasons.deepSharedHistory"),
        some_shared_history: t("promises.new.prediction.reasons.someSharedHistory"),
        new_counterparty: t("promises.new.prediction.reasons.newCounterparty"),
        counterparty_responsive: t("promises.new.prediction.reasons.counterpartyResponsive"),
        counterparty_unresponsive: t("promises.new.prediction.reasons.counterpartyUnresponsive"),
        has_deadline: t("promises.new.prediction.reasons.hasDeadline"),
        no_deadline: t("promises.new.prediction.reasons.noDeadline"),
        short_deadline_risk: t("promises.new.prediction.reasons.shortDeadlineRisk"),
        clear_details: t("promises.new.prediction.reasons.clearDetails"),
        unclear_details: t("promises.new.prediction.reasons.unclearDetails"),
        public_commitment: t("promises.new.prediction.reasons.publicCommitment"),
      }) as Record<PredictionReasonKey, string>,
    [t]
  );

  const predictionResult = useMemo(() => {
    if (!predictionReady) return null;

    const actorMetrics = executor === "me" ? predictionInput.actorMetrics : undefined;

    return generateDealPrediction({
      ...predictionInput,
      actorMetrics,
      deal: {
        hasDeadline: Boolean(dueAt),
        hoursToDeadline: dueAt ? (dueAt.getTime() - Date.now()) / (60 * 60 * 1000) : null,
        isPublic: visibility === "public",
        detailsText: details,
      },
    });
  }, [predictionInput, predictionReady, dueAt, visibility, details, executor]);

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
                className="cursor-pointer rounded-lg border border-white/10 p-2 text-slate-200 transition hover:border-emerald-300/40 hover:bg-white/5 hover:text-emerald-100"
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
                className="cursor-pointer rounded-lg border border-white/10 p-2 text-slate-200 transition hover:border-emerald-300/40 hover:bg-white/5 hover:text-emerald-100"
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
                      "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm transition",
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
              className="absolute inset-0 cursor-pointer bg-black/60"
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
                  className="cursor-pointer rounded-full border border-white/10 p-1 text-slate-300 transition hover:border-emerald-300/40 hover:bg-white/5 hover:text-white"
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
                    className="cursor-pointer rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/60 hover:bg-white/5 hover:text-emerald-100"
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
                          "rounded-xl border px-2 py-2 text-sm transition cursor-pointer",
                          isSelected
                            ? "border-emerald-300/70 bg-emerald-400/20 text-emerald-100"
                            : "border-white/10 text-slate-200 hover:border-emerald-300/50 hover:bg-white/5 hover:text-emerald-100"
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
        router.replace(localizeLoginPath(localizePath("/promises/new", locale), locale));
        return;
      }
      setAuthToken(sessionData.session.access_token);

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
    if (!ENABLE_GROUP_SELECTION) {
      setIsGroupsLoading(false);
      return;
    }

    let active = true;

    const loadGroups = async () => {
      setIsGroupsLoading(true);
      let supabase;
      try {
        supabase = requireSupabase();
      } catch {
        if (active) setIsGroupsLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        if (active) {
          setGroups([]);
          setIsGroupsLoading(false);
        }
        return;
      }

      const { data } = await supabase
        .from("promise_groups")
        .select("id,title")
        .eq("owner_user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!active) return;
      setGroups((data ?? []) as Array<{ id: string; title: string }>);
      setIsGroupsLoading(false);
    };

    void loadGroups();

    return () => {
      active = false;
    };
  }, [ENABLE_GROUP_SELECTION]);

  useEffect(() => {
    if (!ENABLE_GROUP_SELECTION) return;
    if (!isGroupMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!groupMenuRef.current?.contains(target) && !groupButtonRef.current?.contains(target)) {
        setIsGroupMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsGroupMenuOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [ENABLE_GROUP_SELECTION, isGroupMenuOpen]);

  useEffect(() => {
    if (selectedCounterparty || counterpartyQuery.trim().length < 2) {
      setCounterpartyResults([]);
      setIsCounterpartySearching(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsCounterpartySearching(true);
        const supabase = requireSupabase();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          if (!active) return;
          setCounterpartyResults([]);
          setCounterpartyActiveIndex(0);
          return;
        }

        const res = await fetch(
          `/api/user-search?q=${encodeURIComponent(counterpartyQuery.trim())}`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const payload = (await res.json().catch(() => null)) as {
          users?: Array<{
            id: string;
            handle: string;
            display_name: string | null;
            avatar_url: string | null;
          }>;
        } | null;
        if (!active) return;
        const users = payload?.users ?? [];
        setCounterpartyResults(users);
        setCounterpartyActiveIndex(0);
      } catch {
        if (!active) return;
        setCounterpartyResults([]);
      } finally {
        if (active) setIsCounterpartySearching(false);
      }
    }, 250);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [counterpartyQuery, selectedCounterparty]);

  useEffect(() => {
    if (!authToken) return;
    let active = true;
    const controller = new AbortController();

    const loadPredictionMetrics = async () => {
      try {
        const query = selectedCounterparty
          ? `?counterpartyId=${encodeURIComponent(selectedCounterparty.id)}`
          : "";
        const response = await fetch(`/api/promises/prediction${query}`, {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) return;
        const payload = (await response.json()) as PredictionInput;
        if (!active) return;
        setPredictionInput(payload);
      } catch {
        if (!active) return;
        setPredictionInput({});
      }
    };

    void loadPredictionMetrics();

    return () => {
      active = false;
      controller.abort();
    };
  }, [authToken, selectedCounterparty]);

  useEffect(() => {
    if (!showCounterpartyDropdown) return;
    setCounterpartyActiveIndex(0);
  }, [counterpartyResults, showCounterpartyDropdown]);

  useEffect(() => {
    if (typeof window === "undefined" || draftHydrated.current) return;

    try {
      const rawDraft = window.sessionStorage.getItem(DEAL_DRAFT_STORAGE_KEY);
      if (!rawDraft) return;
      const parsedDraft = JSON.parse(rawDraft) as {
        title?: string;
        details?: string;
        conditionText?: string;
        selectedGroupId?: string;
        dueAt?: string | null;
        executor?: "me" | "other";
        visibility?: "private" | "public";
        isImportant?: boolean;
        selectedCounterparty?: {
          id: string;
          handle: string;
          displayName: string | null;
          avatarUrl: string | null;
        } | null;
      };

      setTitle(parsedDraft.title ?? "");
      setDetails(parsedDraft.details ?? "");
      setConditionText(parsedDraft.conditionText ?? "");
      setShowCondition((parsedDraft.conditionText ?? "").trim().length > 0);
      setSelectedGroupId(parsedDraft.selectedGroupId ?? "");
      setExecutor(parsedDraft.executor === "other" ? "other" : "me");
      setVisibility(parsedDraft.visibility === "public" ? "public" : "private");
      setIsImportant(parsedDraft.isImportant ?? false);
      setSelectedCounterparty(parsedDraft.selectedCounterparty ?? null);

      if (parsedDraft.dueAt) {
        const parsedDate = new Date(parsedDraft.dueAt);
        if (!Number.isNaN(parsedDate.getTime())) {
          setDueAt(parsedDate);
        }
      }
    } catch {
      window.sessionStorage.removeItem(DEAL_DRAFT_STORAGE_KEY);
    } finally {
      draftHydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !draftHydrated.current) return;

    const draft = {
      title,
      details,
      conditionText,
      selectedGroupId,
      dueAt: dueAt ? dueAt.toISOString() : null,
      executor,
      visibility,
      isImportant,
      selectedCounterparty,
    };

    window.sessionStorage.setItem(DEAL_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [conditionText, details, dueAt, executor, visibility, isImportant, selectedCounterparty, selectedGroupId, title]);

  useEffect(() => {
    prefillResolved.current = false;
    setPrefillRetryTick(0);
    setShowPrefillConfirmation(false);
  }, [fromPromiseId]);

  useEffect(() => {
    if (!fromPromiseId || prefillResolved.current) return;

    let active = true;

    const prefillFromExpiredDeal = async () => {
      let supabase;
      try {
        supabase = requireSupabase();
      } catch {
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        if (prefillRetryTick >= PREFILL_MAX_RETRIES) {
          prefillResolved.current = true;
          return;
        }
        if (active) {
          window.setTimeout(() => {
            setPrefillRetryTick((prev) => prev + 1);
          }, 250);
        }
        return;
      }

      const { data: sourceDeal } = await supabase
        .from("promises")
        .select(
          "id,title,details,condition_text,is_important,counterparty_id,due_at,visibility,group_id,creator_id,promisor_id,promisee_id,invite_status,counterparty_accepted_at,accepted_at,declined_at,ignored_at,expires_at,cancelled_at"
        )
        .eq("id", fromPromiseId)
        .eq("creator_id", session.user.id)
        .maybeSingle();

      if (!active) return;

      if (!sourceDeal || getPromiseInviteStatus(sourceDeal) !== "expired") {
        prefillResolved.current = true;
        return;
      }

      setTitle(sourceDeal.title ?? "");
      setDetails(sourceDeal.details ?? "");
      const nextCondition = sourceDeal.condition_text ?? "";
      setConditionText(nextCondition);
      setShowCondition(nextCondition.trim().length > 0);
      setVisibility(sourceDeal.visibility === "public" ? "public" : "private");
      setIsImportant(sourceDeal.is_important === true);
      setSelectedGroupId(sourceDeal.group_id ?? "");

      if (sourceDeal.due_at) {
        const dueDate = new Date(sourceDeal.due_at);
        if (!Number.isNaN(dueDate.getTime())) {
          setDueAt(dueDate);
        }
      }

      const wasCreatorExecutor = sourceDeal.promisor_id === sourceDeal.creator_id;
      setExecutor(wasCreatorExecutor ? "me" : "other");

      if (sourceDeal.counterparty_id) {
        const { data: counterpartyProfile } = await supabase
          .from("profiles")
          .select("id,handle,display_name,avatar_url")
          .eq("id", sourceDeal.counterparty_id)
          .maybeSingle();

        if (active && counterpartyProfile?.id) {
          setSelectedCounterparty({
            id: counterpartyProfile.id,
            handle: counterpartyProfile.handle,
            displayName: counterpartyProfile.display_name,
            avatarUrl: counterpartyProfile.avatar_url,
          });
        }
      }

      prefillResolved.current = true;
      setShowPrefillConfirmation(true);
    };

    void prefillFromExpiredDeal();

    return () => {
      active = false;
    };
  }, [fromPromiseId, prefillRetryTick]);

  const selectCounterparty = (user: {
    id: string;
    handle: string;
    display_name: string | null;
    avatar_url: string | null;
  }) => {
    setSelectedCounterparty({
      id: user.id,
      handle: user.handle,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
    });
    setCounterpartyQuery("");
    setCounterpartyResults([]);
    setShowCounterpartyDropdown(false);
  };

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

    const secondPartyUserId = selectedCounterparty?.id ?? null;

    const shouldMakePublic = visibility === "public" && isPublicProfile;
    const payload = {
      title: title.trim(),
      details: details.trim() || null,
      conditionText: conditionText.trim() || null,
      secondPartyUserId,
      dueAt: normalizedDueAt ? normalizedDueAt.toISOString() : null,
      executor,
      visibility: shouldMakePublic ? "public" : "private",
      groupId: selectedGroupId || null,
      isImportant,
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
    } catch (err) {
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
      setError(
        body.error ?? t("promises.new.errors.createFailed", { entityLower: promiseLabels.entityLower })
      );
      return;
    }

    const body = (await res.json().catch(() => null)) as { id?: string } | null;

    if (!body?.id) {
      setError(t("promises.new.errors.createFailed", { entityLower: promiseLabels.entityLower }));
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(DEAL_DRAFT_STORAGE_KEY);
    }

    router.push(localizePath(`/promises/${body.id}`, locale));
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      {calendarPopover}
      {timePicker}
      <div className="absolute inset-0 hero-grid" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(82,193,106,0.22),transparent_30%),radial-gradient(circle_at_70%_10%,rgba(73,123,255,0.12),transparent_28%),radial-gradient(circle_at_55%_65%,rgba(34,55,93,0.18),transparent_40%)]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 md:py-10">
        <div className="w-full max-w-2xl space-y-5 rounded-3xl border border-white/10 bg-black/40 p-5 pb-28 shadow-2xl shadow-black/40 backdrop-blur sm:p-8 sm:pb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.new.eyebrow", { newEntity: promiseLabels.newEntity })}
              </p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                {t("promises.new.title", { entityLower: promiseLabels.entityLower })}
              </h1>
              <p className="text-sm text-slate-300">
                {t("promises.new.subtitle", { entityLower: promiseLabels.entityLower })}
              </p>
              {showPrefillConfirmation && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/20 bg-emerald-400/5 px-2.5 py-1.5 text-xs text-emerald-100/90">
                  <Info className="h-3.5 w-3.5" aria-hidden />
                  {t("promises.new.prefill.fromExpiredDeal")}
                </p>
              )}
            </div>
          </div>

          <div className="grid items-start gap-5 sm:grid-cols-2">
            <div className="space-y-2 text-sm text-slate-200 sm:col-span-2">
              <div className="flex items-center gap-2">
                <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                  {t("promises.new.fields.executor", { executorRole: promiseLabels.executorRole })}
                </span>
                <Tooltip label={t("promises.new.fields.executorHelper")} placement="top">
                  <span
                    aria-label={t("promises.new.fields.executorHelper")}
                    className="inline-flex items-center justify-center text-slate-500 transition hover:text-emerald-100"
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </Tooltip>
              </div>
              <div className="flex w-full rounded-2xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setExecutor("me")}
                  className={`flex-1 cursor-pointer rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    executor === "me"
                      ? "bg-emerald-400/90 text-slate-950 shadow shadow-emerald-500/20"
                      : "text-slate-200 hover:bg-white/10 hover:text-emerald-100"
                  }`}
                >
                  {t("promises.new.executor.me")}
                </button>
                <button
                  type="button"
                  onClick={() => setExecutor("other")}
                  className={`flex-1 cursor-pointer rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    executor === "other"
                      ? "bg-emerald-400/90 text-slate-950 shadow shadow-emerald-500/20"
                      : "text-slate-200 hover:bg-white/10 hover:text-emerald-100"
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
                placeholder={t("promises.new.placeholders.title", { entityLower: promiseLabels.entityLower })}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            {ENABLE_GROUP_SELECTION && (
              <label className="space-y-2 text-sm text-slate-200 sm:col-span-2">
                <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                  {t("promises.new.fields.group")}
                </span>
                <div className="relative">
                  <button
                    type="button"
                    ref={groupButtonRef}
                    onClick={() => !isGroupsLoading && setIsGroupMenuOpen((open) => !open)}
                    aria-haspopup="listbox"
                    aria-expanded={isGroupMenuOpen}
                    aria-label={t("promises.new.fields.group")}
                    disabled={isGroupsLoading}
                    className="inline-flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="truncate">{selectedGroupLabel}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-300 transition-transform ${isGroupMenuOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>

                  {isGroupMenuOpen && (
                    <div
                      ref={groupMenuRef}
                      role="listbox"
                      aria-label={t("promises.new.fields.group")}
                      className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 p-1 shadow-xl shadow-black/50 backdrop-blur"
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedGroupId === ""}
                        onClick={() => {
                          setSelectedGroupId("");
                          setIsGroupMenuOpen(false);
                        }}
                        className={[
                          "flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
                          selectedGroupId === ""
                            ? "bg-emerald-400/90 text-slate-950"
                            : "text-slate-100 hover:bg-white/10",
                        ].join(" ")}
                      >
                        {t("promises.new.group.none")}
                      </button>
                      {groups.map((group) => {
                        const selected = selectedGroupId === group.id;
                        return (
                          <button
                            key={group.id}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setSelectedGroupId(group.id);
                              setIsGroupMenuOpen(false);
                            }}
                            className={[
                              "flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
                              selected ? "bg-emerald-400/90 text-slate-950" : "text-slate-100 hover:bg-white/10",
                            ].join(" ")}
                          >
                            {group.title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{t("promises.new.group.helper")}</span>
                  <LocalizedLink
                    href="/promises/groups?returnTo=%2Fpromises%2Fnew"
                    className="text-emerald-200 hover:text-emerald-100"
                  >
                    {t("promises.new.group.manage")}
                  </LocalizedLink>
                </div>
              </label>
            )}

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
              {!shouldShowCondition && (
                <div className="flex -mt-1">
                  <button
                    type="button"
                    onClick={() => setShowCondition(true)}
                    className="cursor-pointer text-xs font-semibold text-slate-300 transition hover:text-emerald-100"
                  >
                    {t("promises.new.actions.addCondition")}
                  </button>
                </div>
              )}
            </label>

            {shouldShowCondition && (
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
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleRemoveCondition}
                    className="cursor-pointer text-xs font-semibold text-slate-300 transition hover:text-emerald-100"
                  >
                    {t("promises.new.actions.removeCondition")}
                  </button>
                </div>
              </label>
            )}

            <div className="sm:col-span-2">
              <div className="grid items-start gap-5 sm:grid-cols-2">
                {executor && (
                  <div className="text-sm text-slate-200">
                    <label className="space-y-2 text-sm text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                          {t("promises.new.fields.counterparty")}
                        </span>
                        <Tooltip label={t("promises.new.fields.counterpartyHelper")} placement="top">
                          <span
                            aria-label={t("promises.new.fields.counterpartyHelper")}
                            className="inline-flex items-center justify-center text-slate-500 transition hover:text-emerald-100"
                          >
                            <Info className="h-3.5 w-3.5" aria-hidden />
                          </span>
                        </Tooltip>
                      </div>
                      {selectedCounterparty ? (
                        <div className="flex h-11 items-center justify-between rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-3 text-sm text-emerald-100">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="h-7 w-7 overflow-hidden rounded-full bg-white/10">
                              {selectedCounterparty.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={selectedCounterparty.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-slate-200">
                                  @{selectedCounterparty.handle.slice(0, 1).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="truncate">
                              {selectedCounterparty.displayName ?? `@${selectedCounterparty.handle}`} · @{selectedCounterparty.handle}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCounterparty(null);
                              setCounterpartyQuery("");
                              setCounterpartyResults([]);
                              setShowCounterpartyDropdown(false);
                            }}
                            aria-label={t("promises.new.actions.removeCounterparty")}
                            className="ml-2 inline-flex cursor-pointer rounded-full border border-emerald-300/40 p-1 text-emerald-100 transition hover:bg-white/10"
                          >
                            <X className="h-3 w-3" aria-hidden />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            id="counterparty"
                            autoComplete="off"
                            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm leading-5 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                            placeholder={
                              executor === "me"
                                ? t("promises.new.placeholders.counterpartyMe")
                                : t("promises.new.placeholders.counterpartyOther")
                            }
                            value={counterpartyQuery}
                            onFocus={() => setShowCounterpartyDropdown(true)}
                            onBlur={() => {
                              window.setTimeout(() => setShowCounterpartyDropdown(false), 120);
                            }}
                            onChange={(e) => {
                              setCounterpartyQuery(e.target.value);
                              setShowCounterpartyDropdown(true);
                            }}
                            onKeyDown={(e) => {
                              if (!showCounterpartyDropdown || counterpartyQuery.trim().length < 2) return;
                              if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setCounterpartyActiveIndex((prev) =>
                                  Math.min(prev + 1, Math.max(counterpartyResults.length - 1, 0))
                                );
                              }
                              if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setCounterpartyActiveIndex((prev) => Math.max(prev - 1, 0));
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                setShowCounterpartyDropdown(false);
                              }
                              if (e.key === "Enter") {
                                if (counterpartyResults[counterpartyActiveIndex]) {
                                  e.preventDefault();
                                  selectCounterparty(counterpartyResults[counterpartyActiveIndex]);
                                }
                              }
                            }}
                          />
                          {showCounterpartyDropdown && counterpartyQuery.trim().length >= 2 && (
                            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 shadow-xl shadow-black/40">
                              {isCounterpartySearching && (
                                <p className="px-3 py-2 text-xs text-slate-400">
                                  {t("promises.new.search.searching")}
                                </p>
                              )}
                              {!isCounterpartySearching && counterpartyResults.length === 0 && (
                                <div className="px-3 py-3">
                                  <p className="text-xs text-slate-400">{t("promises.new.search.noResults")}</p>
                                </div>
                              )}
                              {!isCounterpartySearching &&
                                counterpartyResults.map((user, index) => (
                                  <button
                                    key={user.id}
                                    type="button"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      selectCounterparty(user);
                                    }}
                                    className={clsx(
                                      "flex w-full cursor-pointer items-center gap-3 border-b border-white/5 px-3 py-2 text-left last:border-b-0 hover:bg-white/5",
                                      index === counterpartyActiveIndex && "bg-white/10"
                                    )}
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
                                      {t("promises.new.search.inDreddi")}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </label>
                  </div>
                )}

                <div className="space-y-2 text-sm text-slate-200">
                  <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                    {t("promises.new.fields.dueDate")}
                  </span>
                  <div className="relative flex flex-col sm:flex-row sm:items-center">
                    <button
                      type="button"
                      ref={triggerRef}
                      onClick={() => setIsCalendarOpen((open) => !open)}
                      aria-expanded={isCalendarOpen}
                      aria-label={t("promises.new.fields.dueDate")}
                      className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 pr-10 text-left text-sm leading-5 text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/10 sm:flex-1"
                    >
                      <CalendarIcon className="h-4 w-4 text-emerald-200" aria-hidden />
                      <span
                        className={clsx("flex-1", dueAt ? "text-slate-100" : "text-white/50")}
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
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-full border border-transparent p-1 text-slate-400 transition hover:border-white/10 hover:bg-white/10 hover:text-slate-100"
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
                        className="cursor-pointer text-xs font-semibold text-emerald-200 transition hover:text-emerald-100"
                      >
                        {t("promises.new.actions.changeTime")}
                      </button>
                    </div>
                  )}
                </div>
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.new.fields.settings")}
              </p>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                <div className="space-y-4">
                <div>
                  <button
                    type="button"
                    onClick={() => setIsImportant((prev) => !prev)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-emerald-300/40"
                  >
                    <span className="min-w-0 flex-1 text-sm font-semibold text-white">
                      {t("promises.new.settings.importance.toggle")}
                    </span>
                    <span
                      role="switch"
                      aria-checked={isImportant}
                      aria-label={t("promises.new.settings.importance.toggle")}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition ${
                        isImportant
                          ? "border-emerald-300/50 bg-emerald-400/70"
                          : "border-white/20 bg-white/10"
                      }`}
                    >
                      <span
                        className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition ${
                          isImportant ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </span>
                  </button>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {t("promises.new.settings.importance.helper")}
                  </p>
                </div>

                <div className="pt-1">
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                    <span className="min-w-0 flex-1 text-sm font-semibold text-white">
                      {t("promises.new.visibility.public.label")}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={visibility === "public"}
                      aria-label={t("promises.new.settings.visibility.title")}
                      onClick={() =>
                        setVisibility((prev) => (prev === "public" ? "private" : "public"))
                      }
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border transition ${
                        visibility === "public"
                          ? "border-emerald-300/50 bg-emerald-400/70 hover:bg-emerald-400/80"
                          : "border-white/20 bg-white/10 hover:bg-white/20"
                      } hover:border-emerald-300/60`}
                    >
                      <span
                        className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition ${
                          visibility === "public" ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {t("promises.new.settings.visibility.helper")}
                  </p>
                </div>
              </div>
            </div>
            </div>

            {predictionResult && (
              <section className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/5 p-4 text-sm text-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                      {t("promises.new.prediction.title")}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {t("promises.new.prediction.chance", { score: predictionResult.score })}
                    </p>
                    {!isPredictionExpanded && (
                      <p className="mt-1 text-xs text-slate-300">
                        {t(`promises.new.prediction.bands.${predictionResult.band}`)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPredictionExpanded((prev) => !prev)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100"
                  >
                    {isPredictionExpanded
                      ? t("promises.new.prediction.actions.collapse")
                      : t("promises.new.prediction.actions.expand")}
                    <ChevronDown
                      className={clsx(
                        "h-3.5 w-3.5 transition-transform",
                        isPredictionExpanded && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </button>
                </div>

                {isPredictionExpanded && (
                  <>
                    <p className="mt-2 text-xs text-slate-300">
                      {t(`promises.new.prediction.bands.${predictionResult.band}`)}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                      {t("promises.new.prediction.why")}
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
                      {predictionResult.reasonKeys.map((reasonKey) => (
                        <li key={reasonKey} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-200/80" />
                          <span>{reasonText[reasonKey]}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}
          </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={createPromise}
              disabled={busy || !title.trim()}
              className="hidden h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 sm:flex"
            >
              {busy
                ? t("promises.new.creating", { entityLower: promiseLabels.entityLower })
                : t("promises.new.submit", { entityLower: promiseLabels.entityLower })}
            </button>

            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                <p>{error}</p>
                {sessionExpired && (
                  <LocalizedLink
                    href={localizeLoginPath(localizePath("/promises/new", locale), locale)}
                    className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-emerald-200 hover:text-emerald-100"
                  >
                    Sign in again →
                  </LocalizedLink>
                )}
              </div>
            )}
          </div>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur sm:hidden">
            <button
              onClick={createPromise}
              disabled={busy || !title.trim()}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? t("promises.new.creating", { entityLower: promiseLabels.entityLower })
                : t("promises.new.submit", { entityLower: promiseLabels.entityLower })}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

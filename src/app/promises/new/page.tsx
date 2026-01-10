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
import { useT } from "@/lib/i18n/I18nProvider";

export default function NewPromisePage() {
  const t = useT();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [dueAt, setDueAt] = useState<Date | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
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

  const supabaseErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : "Authentication is unavailable in this preview.";

  const formattedDueAt = useMemo(
    () => (dueAt ? format(dueAt, "dd.MM.yyyy") : t("promises.new.placeholders.dueDate")),
    [dueAt, t]
  );

  const normalizedDueAt = useMemo(() => {
    if (!dueAt) return null;
    const normalized = new Date(dueAt);
    normalized.setHours(12, 0, 0, 0);
    return normalized;
  }, [dueAt]);

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
                      next.setHours(12, 0, 0, 0);
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
      }
    };

    void ensureSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function createPromise() {
    setBusy(true);
    setError(null);

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
      router.push(`/login?next=${encodeURIComponent("/promises/new")}`);
      return;
    }

    const user = session.user;
    const counterpartyContact = counterparty.trim();

    if (!counterpartyContact) {
      setBusy(false);
      setError(t("promises.new.errors.counterpartyRequired"));
      return;
    }

    const inviteToken =
      crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const { data: insertData, error: insertError } = await supabase
      .from("promises")
      .insert({
        creator_id: user.id,
        promisor_id: executor === "me" ? user.id : null,
        promisee_id: executor === "other" ? user.id : null,
        title: title.trim(),
        details: details.trim() || null,
        counterparty_contact: counterpartyContact,
        due_at: normalizedDueAt ? normalizedDueAt.toISOString() : null,
        status: "active",
        invite_token: inviteToken,
      })
      .select("id")
      .single();

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/promises/${insertData.id}`);
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-950 via-[#0a101a] to-[#05070b] text-slate-100">
      {calendarPopover}
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
            <Link
              href="/promises"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100"
            >
              ← {t("promises.new.back")}
            </Link>
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

            {executor && (
              <div className="space-y-2 text-sm text-slate-200">
                <label className="space-y-2">
                  <span className="block text-xs uppercase tracking-[0.2em] text-emerald-200">
                    {t("promises.new.fields.counterparty")}
                  </span>
                  <input
                    id="counterparty"
                    aria-describedby="counterparty-helper"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/40"
                    placeholder={
                      executor === "me"
                        ? t("promises.new.placeholders.counterpartyMe")
                        : t("promises.new.placeholders.counterpartyOther")
                    }
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                  />
                </label>
                <p id="counterparty-helper" className="text-xs text-slate-400">
                  {t("promises.new.fields.counterpartyHelper")}
                </p>
              </div>
            )}

            <div className="space-y-2 text-sm text-slate-200">
              <span className="block min-h-[2rem] text-xs uppercase tracking-[0.2em] text-emerald-200">
                {t("promises.new.fields.dueDate")}
              </span>
              <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  ref={triggerRef}
                  onClick={() => setIsCalendarOpen((open) => !open)}
                  aria-expanded={isCalendarOpen}
                  aria-label={t("promises.new.fields.dueDate")}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-left text-sm text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/10 sm:flex-1"
                >
                  <CalendarIcon className="h-4 w-4 text-emerald-200" aria-hidden />
                  <span className={clsx("flex-1", dueAt ? "text-slate-100" : "text-slate-500")}>
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
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={createPromise}
              disabled={busy || !title.trim() || !counterparty.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:translate-y-[-1px] hover:shadow-emerald-400/50 disabled:translate-y-0 disabled:opacity-60"
            >
              {busy ? t("promises.new.creating") : t("promises.new.submit")}
            </button>

            {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
          </div>
        </div>
      </div>
    </main>
  );
}

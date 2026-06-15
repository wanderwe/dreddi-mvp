"use client";

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

type DateFieldProps = {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  locale: string;
  placeholder: string;
  clearLabel: string;
  ariaLabel: string;
};

export function DateField({ value, onChange, locale, placeholder, clearLabel, ariaLabel }: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(value ?? new Date()));
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverStyles, setPopoverStyles] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "top" | "bottom";
  } | null>(null);

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }), [locale]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => format(addDays(start, index), "EE"));
  }, []);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const result: Date[] = [];
    let current = start;
    while (current <= end) {
      result.push(current);
      current = addDays(current, 1);
    }
    return result;
  }, [month]);

  useEffect(() => {
    if (!isOpen) return;
    setMonth(startOfMonth(value ?? new Date()));
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
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
      const width = Math.min(Math.max(triggerRect.width, Math.min(320, maxWidth)), maxWidth);

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
  }, [isOpen, month]);

  const popover =
    isOpen && typeof document !== "undefined"
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
                onClick={() => setMonth((prev) => subMonths(prev, 1))}
                className="cursor-pointer rounded-lg border border-white/10 p-2 text-slate-200 transition hover:border-emerald-300/40 hover:bg-white/5 hover:text-emerald-100"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <div className="text-sm font-semibold text-slate-100">{format(month, "MMMM yyyy")}</div>
              <button
                type="button"
                onClick={() => setMonth((prev) => addMonths(prev, 1))}
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
              {days.map((day) => {
                const isSelected = !!value && isSameDay(day, value);
                const inMonth = isSameMonth(day, month);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      const next = new Date(day);
                      next.setHours(23, 59, 0, 0);
                      onChange(next);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm transition",
                      isSelected ? "bg-emerald-400/90 text-slate-950" : "text-slate-200 hover:bg-white/10",
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

  return (
    <>
      {popover}
      <div className="relative flex flex-col sm:flex-row sm:items-center">
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-label={ariaLabel}
          className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 pr-10 text-left text-sm leading-5 text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/10 sm:flex-1"
        >
          <CalendarIcon className="h-4 w-4 text-emerald-200" aria-hidden />
          <span className={clsx("flex-1", value ? "text-slate-100" : "text-white/50")}>
            {value ? dateFormatter.format(value) : placeholder}
          </span>
        </button>
        {value && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChange(undefined);
            }}
            aria-label={clearLabel}
            title={clearLabel}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-full border border-transparent p-1 text-slate-400 transition hover:border-white/10 hover:bg-white/10 hover:text-slate-100"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </>
  );
}

export default DateField;

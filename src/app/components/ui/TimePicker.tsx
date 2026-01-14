"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Clock } from "lucide-react";

const padTime = (value: number) => value.toString().padStart(2, "0");

const parseTimeValue = (value: string | null | undefined) => {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
};

type TimePickerProps = {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  placeholder?: string;
  stepMinutes?: number;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
};

export function TimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Select time",
  stepMinutes = 15,
  ariaLabel = "Select time",
  className = "",
  buttonClassName = "",
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverStyles, setPopoverStyles] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "top" | "bottom";
  } | null>(null);

  const parsedValue = useMemo(() => parseTimeValue(value), [value]);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
  const minutes = useMemo(() => {
    const safeStep = stepMinutes > 0 ? stepMinutes : 15;
    const list: number[] = [];
    for (let minute = 0; minute < 60; minute += safeStep) {
      list.push(minute);
    }
    return list;
  }, [stepMinutes]);

  const setTimeValue = (nextHour: number | null, nextMinute: number | null) => {
    const hour = nextHour ?? parsedValue?.hour ?? 0;
    const minute = nextMinute ?? parsedValue?.minute ?? 0;
    onChange(`${padTime(hour)}:${padTime(minute)}`);
  };

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
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Hours</div>
                <div className="mt-2 grid grid-cols-6 gap-1">
                  {hours.map((hour) => (
                    <button
                      key={`hour-${hour}`}
                      type="button"
                      onClick={() => setTimeValue(hour, null)}
                      className={clsx(
                        "flex h-8 items-center justify-center rounded-lg border border-white/10 text-xs font-medium text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
                        parsedValue?.hour === hour && "border-emerald-300/60 bg-emerald-400/90 text-slate-950"
                      )}
                    >
                      {padTime(hour)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Minutes</div>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {minutes.map((minute) => (
                    <button
                      key={`minute-${minute}`}
                      type="button"
                      onClick={() => setTimeValue(null, minute)}
                      className={clsx(
                        "flex h-8 items-center justify-center rounded-lg border border-white/10 text-xs font-medium text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
                        parsedValue?.minute === minute &&
                          "border-emerald-300/60 bg-emerald-400/90 text-slate-950"
                      )}
                    >
                      {padTime(minute)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

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
      const desiredWidth = Math.max(triggerRect.width, Math.min(320, maxWidth));
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
  }, [isOpen]);

  return (
    <div className={clsx("relative", className)}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
        className={clsx(
          "flex h-11 w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm leading-5 text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-50",
          buttonClassName
        )}
      >
        <Clock className="h-4 w-4 text-emerald-200" aria-hidden />
        <span className={clsx("flex-1", value ? "text-slate-100" : "text-slate-500")}>
          {value || placeholder}
        </span>
      </button>
      {popover}
    </div>
  );
}

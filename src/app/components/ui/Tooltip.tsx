"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  label: string;
  children: ReactNode;
  className?: string;
  tooltipClassName?: string;
  disabled?: boolean;
  placement?: "bottom" | "bottom-right" | "top" | "top-right";
  shouldOpen?: () => boolean;
  // For an info icon, which does nothing else when pressed: a tap or click opens and closes the text.
  // Without it a press closes the tooltip (it belongs to a button whose press does the action), so on a
  // phone, where a tap is all there is, an info icon showed nothing.
  tapToOpen?: boolean;
};

const baseTooltipClasses =
  "pointer-events-none fixed z-[100] max-w-[280px] whitespace-pre-line break-words text-balance rounded-md border border-tone-white/10 bg-tone-950/95 px-2.5 py-1.5 text-[11px] font-medium leading-[1.35] text-tone-100 shadow-lg transition-opacity duration-150";

const VIEWPORT_PADDING = 8;
const TOOLTIP_OFFSET = 8;

type TooltipPosition = {
  top: number;
  left: number;
  placement: "top" | "bottom";
};

export function Tooltip({
  label,
  children,
  className = "",
  tooltipClassName = "",
  disabled = false,
  placement = "bottom",
  shouldOpen,
  tapToOpen = false,
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // A tap on a phone first fakes a hover, which opens the tooltip, then a click: that click must not shut it.
  const openedAtRef = useRef(0);
  const [isPositioned, setIsPositioned] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    placement: "bottom",
  });
  const [isClient, setIsClient] = useState(false);
  const placementConfig = useMemo(() => placement, [placement]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsPositioned(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) return;

      // Wrapped text leaves the box at its full max width however short the lines are: shrink it to
      // the longest line (balanced lines, so it ends up compact rather than one long and one short).
      tooltip.style.width = "";
      const range = document.createRange();
      range.selectNodeContents(tooltip);
      const lines = [...range.getClientRects()];
      if (lines.length > 1) {
        const style = window.getComputedStyle(tooltip);
        const frame = ["paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"].reduce(
          (sum, key) => sum + parseFloat(style[key as keyof CSSStyleDeclaration] as string),
          0
        );
        const longest = Math.max(...lines.map((line) => line.width));
        tooltip.style.width = `${Math.ceil(longest + frame + 1)}px`;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const prefersTop = placementConfig.startsWith("top");
      const prefersRight = placementConfig.includes("right");

      let verticalPlacement: "top" | "bottom" = prefersTop ? "top" : "bottom";
      const spaceAbove = triggerRect.top - TOOLTIP_OFFSET;
      const spaceBelow = viewportHeight - triggerRect.bottom - TOOLTIP_OFFSET;

      if (verticalPlacement === "top" && spaceAbove < tooltipRect.height + VIEWPORT_PADDING) {
        verticalPlacement = "bottom";
      } else if (
        verticalPlacement === "bottom" &&
        spaceBelow < tooltipRect.height + VIEWPORT_PADDING
      ) {
        verticalPlacement = "top";
      }

      let top =
        verticalPlacement === "top"
          ? triggerRect.top - tooltipRect.height - TOOLTIP_OFFSET
          : triggerRect.bottom + TOOLTIP_OFFSET;

      let left = prefersRight
        ? triggerRect.right - tooltipRect.width
        : triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;

      if (left + tooltipRect.width > viewportWidth - VIEWPORT_PADDING) {
        left = triggerRect.right - tooltipRect.width;
      }

      if (left < VIEWPORT_PADDING) {
        left = triggerRect.left;
      }

      left = Math.min(
        Math.max(left, VIEWPORT_PADDING),
        viewportWidth - tooltipRect.width - VIEWPORT_PADDING,
      );

      top = Math.min(
        Math.max(top, VIEWPORT_PADDING),
        viewportHeight - tooltipRect.height - VIEWPORT_PADDING,
      );

      setPosition({ top, left, placement: verticalPlacement });
      setIsPositioned(true);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, placementConfig]);

  const openTooltip = () => {
    if (disabled) return;
    if (shouldOpen && !shouldOpen()) return;
    openedAtRef.current = Date.now();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (triggerRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={openTooltip}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={openTooltip}
      onBlur={() => setIsOpen(false)}
      onClick={(event) => {
        event.stopPropagation();
        if (!tapToOpen) {
          setIsOpen(false);
          return;
        }
        // Inside a field's label a tap would also focus the field and pop up the keyboard.
        event.preventDefault();
        if (disabled) return;
        if (Date.now() - openedAtRef.current < 500) return;
        setIsOpen((open) => !open);
      }}
    >
      {children}
      {isClient && isOpen && !disabled
        ? createPortal(
            <span
              ref={tooltipRef}
              className={`${baseTooltipClasses} ${tooltipClassName} ${
                isOpen ? "opacity-100" : "opacity-0"
              }`}
              style={{
                top: position.top,
                left: position.left,
                visibility: isPositioned ? "visible" : "hidden",
              }}
              role="tooltip"
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

export default Tooltip;

"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  label: string;
  children: ReactNode;
  className?: string;
  placement?: "bottom" | "bottom-right" | "top" | "top-right";
};

const baseTooltipClasses =
  "pointer-events-none fixed z-[100] max-w-[220px] whitespace-normal rounded-md border border-white/10 bg-slate-950/90 px-2 py-1 text-[11px] font-medium text-slate-100 shadow-lg transition-opacity duration-150";

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
  placement = "bottom",
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {children}
      {isClient && isOpen
        ? createPortal(
            <span
              ref={tooltipRef}
              className={`${baseTooltipClasses} ${
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

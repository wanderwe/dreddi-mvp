"use client";

import * as React from "react";
import { createPortal } from "react-dom";

type SheetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet components must be used within <Sheet />");
  }
  return context;
}

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <SheetContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

type SheetTriggerProps = {
  asChild?: boolean;
  children: React.ReactNode;
};

type ClickableChildProps = { onClick?: React.MouseEventHandler<HTMLElement> };

export function SheetTrigger({ asChild = false, children }: SheetTriggerProps) {
  const { setOpen } = useSheetContext();

  if (!asChild) {
    return (
      <button type="button" onClick={() => setOpen(true)}>
        {children}
      </button>
    );
  }

  if (!React.isValidElement<ClickableChildProps>(children)) {
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    children.props.onClick?.(event);
    if (!event.defaultPrevented) {
      setOpen(true);
    }
  };

  return React.cloneElement(children, { onClick: handleClick });
}

type SheetCloseProps = {
  asChild?: boolean;
  children: React.ReactNode;
};

export function SheetClose({ asChild = false, children }: SheetCloseProps) {
  const { setOpen } = useSheetContext();

  if (!asChild) {
    return (
      <button type="button" onClick={() => setOpen(false)}>
        {children}
      </button>
    );
  }

  if (!React.isValidElement<ClickableChildProps>(children)) {
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    children.props.onClick?.(event);
    if (!event.defaultPrevented) {
      setOpen(false);
    }
  };

  return React.cloneElement(children, { onClick: handleClick });
}

type SheetPortalProps = {
  children: React.ReactNode;
};

export function SheetPortal({ children }: SheetPortalProps) {
  const { open } = useSheetContext();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted || !open) return null;

  return createPortal(children, document.body);
}

type SheetOverlayProps = React.HTMLAttributes<HTMLDivElement>;

export function SheetOverlay({ className = "", ...props }: SheetOverlayProps) {
  const { setOpen } = useSheetContext();
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    props.onClick?.(event);
    if (!event.defaultPrevented) {
      setOpen(false);
    }
  };

  return (
    <div
      aria-hidden="true"
      {...props}
      onClick={handleClick}
      className={`fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm ${className}`}
    />
  );
}

type SheetContentProps = React.HTMLAttributes<HTMLDivElement>;

export function SheetContent({ className = "", ...props }: SheetContentProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed right-0 top-0 z-[9999] h-full w-[280px] border-l border-white/10 bg-slate-950/95 p-6 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur ${className}`}
      {...props}
    />
  );
}

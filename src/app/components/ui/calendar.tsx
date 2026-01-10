"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "space-y-3",
        caption: "relative flex items-center justify-center pt-1",
        caption_label: "text-sm font-semibold text-slate-100",
        nav: "flex items-center gap-1",
        nav_button:
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-100",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "w-9 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-400",
        row: "mt-2 flex w-full",
        cell: "relative h-9 w-9 p-0 text-center text-sm",
        day:
          "flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition hover:bg-emerald-500/20 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
        day_selected: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
        day_today: "border border-emerald-300/50 text-emerald-100",
        day_outside: "text-slate-600/70",
        day_disabled: "text-slate-700/60",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...iconProps }) => <ChevronLeft className="h-4 w-4" {...iconProps} />,
        IconRight: ({ ...iconProps }) => <ChevronRight className="h-4 w-4" {...iconProps} />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

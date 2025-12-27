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
      className={cn("p-3", className)}
      classNames={{
        // Layout
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button:
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-md border border-input",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-muted-foreground w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 flex items-center justify-center text-sm p-0 relative",

        // Base day: transparent bg, black text, black focus ring, and **black outline on hover with radius**
        day:
          "h-9 w-9 inline-flex items-center justify-center p-0 font-normal " +
          "bg-transparent text-black rounded-md " +
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 focus-visible:rounded-md",

        // Selected day: **white on black** with same radius; keep it black on hover/focus
        day_selected:
          "bg-black text-white rounded-md ",

        // Today (not selected): just black text
        day_today: "text-black",

        // Non-selectable / outside
        day_outside: "text-muted-foreground",
        day_disabled: "text-gray-400 pointer-events-none",

        // Not used
        day_range_middle: "",
        day_range_end: "",
        day_hidden: "invisible",

        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

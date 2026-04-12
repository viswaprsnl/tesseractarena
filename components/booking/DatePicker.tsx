"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  format,
  addDays,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isBefore,
  startOfDay,
  isAfter,
  isSameDay,
  addMonths,
  getDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface DatePickerProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DatePicker({ selectedDate, onSelectDate }: DatePickerProps) {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 30);
  const [viewMonth, setViewMonth] = useState(today);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = addDays(startOfWeek(addDays(monthEnd, 7)), -1);

    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [viewMonth]);

  const canGoBack = isSameMonth(viewMonth, today) ? false : true;
  const canGoForward = isBefore(startOfMonth(viewMonth), startOfMonth(maxDate));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto"
    >
      <h3 className="font-heading text-lg font-bold text-center mb-6">
        Select a Date
      </h3>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, -1))}
          disabled={!canGoBack}
          className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-heading text-sm tracking-wider">
          {format(viewMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          disabled={!canGoForward}
          className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_NAMES.map((day) => (
          <div
            key={day}
            className="text-center text-xs text-muted-foreground font-medium py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(day, viewMonth);
          const isPast = isBefore(day, today);
          const isTooFar = isAfter(day, maxDate);
          const isDisabled = isPast || isTooFar || !isCurrentMonth;
          const isSelected = selectedDate === dateStr;
          const isToday = isSameDay(day, today);
          const dayOfWeek = getDay(day);
          const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

          return (
            <button
              key={dateStr}
              onClick={() => !isDisabled && onSelectDate(dateStr)}
              disabled={isDisabled}
              className={`
                aspect-square rounded-lg text-sm font-medium flex flex-col items-center justify-center transition-all relative
                ${isDisabled ? "opacity-20 cursor-not-allowed" : "hover:bg-primary/20 cursor-pointer"}
                ${isSelected ? "bg-primary text-primary-foreground glow-violet" : ""}
                ${isToday && !isSelected ? "ring-1 ring-accent" : ""}
                ${!isDisabled && !isSelected && isWeekendDay ? "text-accent/80" : ""}
              `}
            >
              <span>{format(day, "d")}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        <span className="text-accent/80">Colored</span> = Weekend (11 AM - 11 PM) · Regular = Weekday (12 PM - 10 PM)
      </p>
    </motion.div>
  );
}

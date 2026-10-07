"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { TimeSlot } from "@/lib/booking-types";

interface TimeSlotGridProps {
  date: string;
  slots: TimeSlot[];
  selectedSlot: string | null;
  isLoading: boolean;
  onSelectSlot: (time: string, displayTime: string) => void;
}

export function TimeSlotGrid({
  date,
  slots,
  selectedSlot,
  isLoading,
  onSelectSlot,
}: TimeSlotGridProps) {
  const dateObj = new Date(date + "T00:00:00");
  const displayDate = format(dateObj, "EEEE, MMMM d, yyyy");
  const availableCount = slots.filter((s) => s.status === "available").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      <h3 className="font-heading text-lg font-bold text-center mb-2">
        Select a Time
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-6">
        {displayDate}
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-3 text-muted-foreground">Loading slots...</span>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground text-center mb-4">
            {availableCount} slot{availableCount !== 1 ? "s" : ""} available · 1 hour each (45 min VR + 15 min changeover)
          </p>

          {/* Slot grid.
              - 3 cols on phones (previously 2 — gave too-wide pills with
                lots of empty space either side of "11:00 AM")
              - 4 cols on sm+ (same as before — fits tightly in the
                wizard's right pane without wrapping)
              - tabular-nums so digits align column-to-column
              - whitespace-nowrap guarantees "11:00 AM" never wraps to
                two lines even in the narrowest pane; without it,
                dropping the Clock icon alone wouldn't fix the squash
                because the browser was wrapping between "11:00" and "AM"
              - The Clock icon that used to sit left of the time is
                removed: redundant in a grid clearly labeled "Select a
                Time," and it was eating the horizontal budget that
                forced the wrap in the first place. */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {slots.map((slot) => {
              const isAvailable = slot.status === "available";
              const isSelected = selectedSlot === slot.time;

              return (
                <button
                  key={slot.time}
                  onClick={() =>
                    isAvailable && onSelectSlot(slot.time, slot.displayTime)
                  }
                  disabled={!isAvailable}
                  className={`
                    h-10 rounded-md text-[13px] font-semibold tracking-tight tabular-nums whitespace-nowrap
                    transition-colors
                    ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                        : isAvailable
                        ? "bg-secondary/40 border border-white/10 text-foreground hover:border-primary/40 hover:bg-primary/10"
                        : "bg-transparent border border-white/5 text-muted-foreground/35 cursor-not-allowed line-through decoration-muted-foreground/30"
                    }
                  `}
                >
                  {slot.displayTime}
                </button>
              );
            })}
          </div>

          {availableCount === 0 && (
            <p className="text-center text-muted-foreground mt-8">
              No slots available for this date. Try another day.
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}

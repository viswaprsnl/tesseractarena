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

          {/* Slot grid — 2 cols at every breakpoint.
              Why not 3 or 4: the wizard's time-grid pane is
              lg:col-span-2 of a lg:grid-cols-5 layout inside a
              lg:col-span-2 of a lg:grid-cols-3 outer, which makes the
              pane roughly 215px wide at desktop (NOT scaling with
              viewport past the lg: breakpoint). A 4-col grid at that
              width gives 46px pills — too narrow for "12:00 PM" (needs
              ~58px) so the leading "1" visually gets cropped on 1280px+
              desktops. 2 cols gives ~100px pills with comfortable
              breathing room; on mobile the stacked layout gives the
              grid the full ~343px, so 2 cols there yields chunky touch
              targets. Keeping the breakpoint uniform avoids the trap
              of "looks fine at the breakpoint I tested, breaks at the
              one I didn't."
              Padding is explicit px-3 so content never kisses the pill
              edge even if a future locale lengthens the format. */}
          <div className="grid grid-cols-2 gap-2.5">
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
                    h-10 px-3 rounded-md text-sm font-semibold tabular-nums whitespace-nowrap
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

"use client";

import { motion } from "framer-motion";
import { Clock, Loader2 } from "lucide-react";
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
            {availableCount} slot{availableCount !== 1 ? "s" : ""} available · 30 min session + 10 min setup
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
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
                    py-3 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5
                    ${
                      isSelected
                        ? "bg-primary text-primary-foreground glow-violet"
                        : isAvailable
                        ? "bg-secondary/50 border border-white/10 hover:border-primary/30 hover:bg-primary/10"
                        : "bg-muted/20 text-muted-foreground/40 cursor-not-allowed line-through"
                    }
                  `}
                >
                  <Clock size={12} className={isSelected ? "" : "text-primary/60"} />
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

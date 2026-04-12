"use client";

import { CalendarDays, Clock, Users, Gamepad2 } from "lucide-react";
import { format } from "date-fns";
import { PRICING } from "@/lib/booking-config";
import type { BookingState } from "@/hooks/use-booking";

export function BookingSummary({ state }: { state: BookingState }) {
  if (state.step < 3) return null;

  const dateDisplay = state.selectedDate
    ? format(new Date(state.selectedDate + "T00:00:00"), "EEE, MMM d")
    : "—";

  return (
    <div className="glass-card p-4 text-sm space-y-3">
      <h4 className="font-heading text-xs tracking-wider uppercase text-muted-foreground mb-2">
        Booking Summary
      </h4>

      {state.selectedDate && (
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-primary shrink-0" />
          <span>{dateDisplay}</span>
        </div>
      )}

      {state.selectedSlotDisplay && (
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-primary shrink-0" />
          <span>{state.selectedSlotDisplay}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Users size={14} className="text-primary shrink-0" />
        <span>
          {state.partySize} {state.partySize === 1 ? "player" : "players"} ·{" "}
          <span className="capitalize">{state.packageType}</span>
        </span>
      </div>

      {state.personalDetails?.gamePreference && (
        <div className="flex items-center gap-2">
          <Gamepad2 size={14} className="text-primary shrink-0" />
          <span>{state.personalDetails.gamePreference}</span>
        </div>
      )}

      <div className="pt-2 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Total</span>
          <span className="font-bold text-lg">
            ₹{(PRICING[state.packageType] * state.partySize).toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { CalendarDays, Clock, Users, Gamepad2 } from "lucide-react";
import { format } from "date-fns";
import {
  calculatePrice,
  calculateSessionPrice,
} from "@/lib/booking-config";
import type { PerPersonPackageType } from "@/lib/booking-types";
import type { BookingState } from "@/hooks/use-booking";
import { allGames } from "@/data/games";

export function BookingSummary({ state }: { state: BookingState }) {
  if (state.step < 3) return null;

  const dateDisplay = state.selectedDate
    ? format(new Date(state.selectedDate + "T00:00:00"), "EEE, MMM d")
    : "—";

  // Sidebar subtotal must mirror what the PackageSelector and server compute
  // — game.pricePerPerson × tier × partySize. Falls back to the legacy flat
  // package price only if the flow is somehow past the picker without a
  // game set (should be impossible in normal use since Continue is
  // disabled).
  const game = allGames.find((g) => g.id === state.selectedGame);
  const perPersonPkg = state.packageType as PerPersonPackageType;
  const subtotal = game?.pricePerPerson
    ? calculateSessionPrice(game.pricePerPerson, perPersonPkg, state.partySize)
    : state.personalDetails
    ? calculatePrice(state.packageType, state.partySize)
    : 0;
  const gameTitle = game?.title || state.personalDetails?.gamePreference;
  // True while the user is still on step 3 and hasn't tapped a game yet.
  const pending = subtotal === 0;

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

      {gameTitle && (
        <div className="flex items-center gap-2">
          <Gamepad2 size={14} className="text-primary shrink-0" />
          <span>{gameTitle}</span>
        </div>
      )}

      <div className="pt-2 border-t border-white/10 space-y-1">
        {state.discount && state.discount.amountOff > 0 ? (
          <>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-green-400">
              <span className="truncate mr-2" title={state.discount.label}>
                {state.discount.label} ({state.discount.badge})
              </span>
              <span>− ₹{state.discount.amountOff.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-lg text-green-400">
                ₹{Math.max(0, subtotal - state.discount.amountOff).toLocaleString("en-IN")}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total</span>
            {pending ? (
              <span className="text-sm text-muted-foreground">
                Pick a game →
              </span>
            ) : (
              <span className="font-bold text-lg">
                ₹{subtotal.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

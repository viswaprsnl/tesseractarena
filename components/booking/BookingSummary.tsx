"use client";

import { CalendarDays, Clock, Users, Gamepad2 } from "lucide-react";
import { format } from "date-fns";
import {
  calculatePrice,
  calculateSessionPrice,
  withGST,
  gstOn,
  GST_PERCENT,
} from "@/lib/booking-config";
import type { PerPersonPackageType } from "@/lib/booking-types";
import type { BookingState } from "@/hooks/use-booking";
import { allGames, availableGames } from "@/data/games";
import { DECIDE_AT_VENUE_ID } from "./PackageSelector";

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
  const isDecideAtVenue = state.selectedGame === DECIDE_AT_VENUE_ID;
  const game = allGames.find((g) => g.id === state.selectedGame);
  const perPersonPkg = state.packageType as PerPersonPackageType;
  // "Decide at venue" uses the highest-priced Available game as the
  // ceiling — same rule as the wizard and the server-side price recompute.
  const priceBasis = isDecideAtVenue
    ? Math.max(...availableGames.map((g) => g.pricePerPerson))
    : game?.pricePerPerson;
  const subtotal = priceBasis
    ? calculateSessionPrice(priceBasis, perPersonPkg, state.partySize)
    : state.personalDetails
    ? calculatePrice(state.packageType, state.partySize)
    : 0;
  const gameTitle = isDecideAtVenue
    ? "Decide at venue"
    : game?.title || state.personalDetails?.gamePreference;
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
        {pending ? (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total</span>
            <span className="text-sm text-muted-foreground">
              Pick a game →
            </span>
          </div>
        ) : (
          (() => {
            const afterDiscount = state.discount
              ? Math.max(0, subtotal - state.discount.amountOff)
              : subtotal;
            const gstLine = gstOn(afterDiscount);
            const totalIncGST = withGST(afterDiscount);
            return (
              <>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Subtotal (excl. GST)</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                {state.discount && state.discount.amountOff > 0 && (
                  <div className="flex justify-between items-center text-xs text-green-400">
                    <span className="truncate mr-2" title={state.discount.label}>
                      {state.discount.label} ({state.discount.badge})
                    </span>
                    <span>− ₹{state.discount.amountOff.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>GST @ {GST_PERCENT}%</span>
                  <span>+ ₹{gstLine.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-white/10">
                  <span className="text-muted-foreground">Total</span>
                  <span
                    className={`font-bold text-lg ${state.discount ? "text-green-400" : ""}`}
                  >
                    ₹{totalIncGST.toLocaleString("en-IN")}
                  </span>
                </div>
              </>
            );
          })()
        )}
      </div>
    </div>
  );
}

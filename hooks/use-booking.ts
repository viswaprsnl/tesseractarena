"use client";

import { useReducer } from "react";
import type { PackageType, TimeSlot } from "@/lib/booking-types";
import { STANDARD_PACKAGE } from "@/lib/booking-types";

export interface ActiveDiscount {
  id: string;
  label: string;
  type: "percent" | "flat";
  value: number;
  badge: string;
  amountOff: number;
}

// Single-page booking state. There is no step machine any more — every
// section of /book is on screen at once, and "can the customer pay yet?"
// is derived from which fields are filled (see BookingWizard). Pricing
// and discounts are derived too (useDiscount), so they never go stale.
export interface BookingState {
  selectedDate: string | null;
  selectedSlot: string | null;
  selectedSlotDisplay: string | null;
  partySize: number;
  // packageType was Solo/Squad/Party pre-2026-11-05 — now always
  // STANDARD_PACKAGE for regular bookings, and only varies for birthday
  // flows. Kept so the booking POST and sheet writer keep their shape.
  packageType: PackageType;
  // Chosen game id (matches Game.id in data/games.ts), or the
  // DECIDE_AT_VENUE_ID sentinel.
  selectedGame: string | null;
  // True when entered from the arena's counter kiosk (/book?kiosk=1).
  // Drives the "pay at counter" UX: no Turnstile, no advance split,
  // and both "pay online" and "pay at counter" are offered.
  isKiosk: boolean;
  isLoading: boolean;
  error: string | null;
  availableSlots: TimeSlot[];
  slotsFetchedAt: number | null;
}

type Action =
  | { type: "SET_DATE"; date: string }
  | { type: "SET_SLOT"; slot: string; displayTime: string }
  | { type: "SET_PARTY_SIZE"; size: number }
  | { type: "SET_GAME"; gameId: string | null }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_SLOTS"; slots: TimeSlot[] };

const initialState: BookingState = {
  selectedDate: null,
  selectedSlot: null,
  selectedSlotDisplay: null,
  partySize: 2,
  packageType: STANDARD_PACKAGE,
  selectedGame: null,
  isKiosk: false,
  isLoading: false,
  error: null,
  availableSlots: [],
  slotsFetchedAt: null,
};

function reducer(state: BookingState, action: Action): BookingState {
  switch (action.type) {
    case "SET_DATE":
      return {
        ...state,
        selectedDate: action.date,
        selectedSlot: null,
        selectedSlotDisplay: null,
        availableSlots: [],
        error: null,
      };
    case "SET_SLOT":
      return {
        ...state,
        selectedSlot: action.slot,
        selectedSlotDisplay: action.displayTime,
        error: null,
      };
    case "SET_PARTY_SIZE":
      return { ...state, partySize: action.size };
    case "SET_GAME":
      return { ...state, selectedGame: action.gameId };
    case "SET_LOADING":
      return { ...state, isLoading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_SLOTS":
      return {
        ...state,
        availableSlots: action.slots,
        slotsFetchedAt: Date.now(),
      };
    default:
      return state;
  }
}

// Pass initialGame when entered via /book?game=xxx so the game is set on
// the very first render rather than through a follow-up useEffect (which
// can no-op in React StrictMode's second render pass).
export function useBooking(options?: {
  initialGame?: string | null;
  initialKiosk?: boolean;
}) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    selectedGame: options?.initialGame ?? initialState.selectedGame,
    isKiosk: options?.initialKiosk ?? initialState.isKiosk,
  });
  return { state, dispatch };
}

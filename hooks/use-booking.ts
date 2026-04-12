"use client";

import { useReducer } from "react";
import type {
  PackageType,
  PaymentMethod,
  TimeSlot,
} from "@/lib/booking-types";

export interface BookingState {
  step: 1 | 2 | 3 | 4 | 5;
  selectedDate: string | null;
  selectedSlot: string | null;
  selectedSlotDisplay: string | null;
  partySize: number;
  packageType: PackageType;
  personalDetails: {
    name: string;
    email: string;
    phone: string;
    gamePreference: string;
    specialRequests: string;
  } | null;
  paymentMethod: PaymentMethod | null;
  bookingId: string | null;
  amount: number;
  isLoading: boolean;
  error: string | null;
  availableSlots: TimeSlot[];
  slotsFetchedAt: number | null;
}

type Action =
  | { type: "SET_DATE"; date: string }
  | { type: "SET_SLOT"; slot: string; displayTime: string }
  | { type: "SET_PARTY_SIZE"; size: number }
  | { type: "SET_PACKAGE"; pkg: PackageType }
  | { type: "SET_DETAILS"; details: BookingState["personalDetails"] }
  | { type: "SET_PAYMENT_METHOD"; method: PaymentMethod }
  | { type: "SET_BOOKING_ID"; id: string }
  | { type: "SET_AMOUNT"; amount: number }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_SLOTS"; slots: TimeSlot[] }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; step: BookingState["step"] }
  | { type: "RESET" };

const initialState: BookingState = {
  step: 1,
  selectedDate: null,
  selectedSlot: null,
  selectedSlotDisplay: null,
  partySize: 2,
  packageType: "squad",
  personalDetails: null,
  paymentMethod: null,
  bookingId: null,
  amount: 0,
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
    case "SET_PACKAGE":
      return { ...state, packageType: action.pkg };
    case "SET_DETAILS":
      return { ...state, personalDetails: action.details };
    case "SET_PAYMENT_METHOD":
      return { ...state, paymentMethod: action.method };
    case "SET_BOOKING_ID":
      return { ...state, bookingId: action.id };
    case "SET_AMOUNT":
      return { ...state, amount: action.amount };
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
    case "NEXT_STEP":
      return {
        ...state,
        step: Math.min(state.step + 1, 5) as BookingState["step"],
        error: null,
      };
    case "PREV_STEP":
      return {
        ...state,
        step: Math.max(state.step - 1, 1) as BookingState["step"],
        error: null,
      };
    case "GO_TO_STEP":
      return { ...state, step: action.step, error: null };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useBooking() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return { state, dispatch };
}

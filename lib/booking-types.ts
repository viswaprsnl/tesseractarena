// Sentinel game id for "I'll decide when I arrive". Not a real game in
// data/games.ts; treated specially throughout the booking flow so the
// customer can hold the slot without picking a specific title. Server
// treats this as "use the max-priced game as the ceiling" — actual
// price is adjusted at the counter based on what they finally play.
// Lives here (and not in PackageSelector where it logically "belongs")
// so BookingWizard + BookingSummary can import it without pulling
// PackageSelector eagerly — PackageSelector is dynamic-imported for
// its code-splitting weight.
export const DECIDE_AT_VENUE_ID = "decide-at-venue";

// Per-person session packages — priced per player, one 30-min VR session.
export type PerPersonPackageType = "solo" | "squad" | "party";

// Fixed-price birthday packages. Each blocks N consecutive slots and the
// advance is a percentage (see BIRTHDAY_ADVANCE_PERCENT in data/birthday).
export type BirthdayPackageType =
  | "birthday-essentials"
  | "birthday-plus"
  | "birthday-ultimate";

export type PackageType = PerPersonPackageType | BirthdayPackageType;

export function isBirthdayPackage(p: string): p is BirthdayPackageType {
  return (
    p === "birthday-essentials" ||
    p === "birthday-plus" ||
    p === "birthday-ultimate"
  );
}
export type PaymentMethod = "razorpay" | "pay_at_center";
export type PaymentStatus = "pending" | "paid" | "pay_at_center";
export type BookingStatus = "confirmed" | "cancelled";
// "past" is emitted for slots on today's date whose start time has already
// elapsed — visually distinct from a real customer booking in the admin UI.
export type SlotStatus = "available" | "booked" | "past";

export interface TimeSlot {
  time: string;
  displayTime: string;
  status: SlotStatus;
}

export interface SlotsResponse {
  date: string;
  dayType: "weekday" | "weekend";
  arena: string;
  slots: TimeSlot[];
}

export interface BookingRequest {
  name: string;
  email: string;
  phone: string;
  date: string;
  timeSlot: string;
  partySize: number;
  package: PackageType;
  gamePreference: string;
  paymentMethod: PaymentMethod;
  specialRequests?: string;
  arenaId?: string;
}

export interface BookingResponse {
  success: boolean;
  booking: {
    bookingId: string;
    date: string;
    timeSlot: string;
    displayTime: string;
    partySize: number;
    package: PackageType;
    amount: number;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
  };
}

export interface BookingRow {
  bookingId: string;
  arenaId: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  timeSlot: string;
  partySize: number;
  package: PackageType;
  gamePreference: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  // Ex-GST session cost. GST + discounts are tracked separately below so
  // this stays the clean revenue basis for Anvio-royalty math and reports.
  amount: number;
  specialRequests: string;
  createdAt: string;
  status: BookingStatus;
  amountPaid: number;     // Cumulative paid so far (advance online + counter).
  balanceDue: number;     // Remaining amount to collect at the counter.
  // GST portion of the amount charged (18% of the ex-GST amount). Collected
  // from the customer and remitted to the government — not our revenue.
  gstAmount: number;
  // Rupees the customer saved via a discount code / launch promo / tier
  // discount. Zero when no discount applied. Useful for measuring promo
  // effectiveness in the admin dashboard.
  discountAmount: number;
}

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

// Regular per-person bookings all share a single flat per-game rate now
// (Anvio ₹1,199, HeroZone ₹899 — see data/games.ts). The historical Solo
// / Squad / Party tier system was retired on 2026-11-05; the `package`
// column on the sheet now writes "standard" for new regular bookings.
// Old rows that still say solo/squad/party are legacy and still readable.
export const STANDARD_PACKAGE = "standard" as const;
export type StandardPackage = typeof STANDARD_PACKAGE;

// Fixed-price birthday packages. Each blocks N consecutive slots and the
// advance is a percentage (see BIRTHDAY_ADVANCE_PERCENT in data/birthday).
// Birthday collapses to a single "birthday-standard" tier on 2026-11-05;
// the three old IDs are kept here because legacy sheet rows still carry
// them, and isBirthdayPackage() needs to recognize both shapes.
export type BirthdayPackageType =
  | "birthday-standard"
  | "birthday-essentials"
  | "birthday-plus"
  | "birthday-ultimate";

export type PackageType = StandardPackage | BirthdayPackageType;

export function isBirthdayPackage(p: string): p is BirthdayPackageType {
  return (
    p === "birthday-standard" ||
    p === "birthday-essentials" ||
    p === "birthday-plus" ||
    p === "birthday-ultimate"
  );
}

// True for any string that COULD have been written to the package column
// in the sheet — current values or legacy ones. Readers that only care
// about "is this a per-person booking or birthday" should use
// isBirthdayPackage() directly and treat everything else as per-person.
export function isLegacyTierPackage(p: string): boolean {
  return p === "solo" || p === "squad" || p === "party";
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

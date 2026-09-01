export type PackageType = "solo" | "squad" | "party";
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
  amount: number;
  specialRequests: string;
  createdAt: string;
  status: BookingStatus;
}

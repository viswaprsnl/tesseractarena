import { format, addDays, isAfter, isBefore, startOfDay, getDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { PackageType, TimeSlot } from "./booking-types";

const TIMEZONE = "Asia/Kolkata";

export const SLOT_DURATION_MINUTES = 40;
export const MAX_PLAYERS = 10;

export const PRICING: Record<PackageType, number> = {
  solo: 1499,
  squad: 1199,
  party: 999,
};

// Weekday (Mon-Fri): 11:00 AM to 10:00 PM (last slot must end by 10 PM)
// Each slot is 40 min (30 min play + 10 min setup)
export const WEEKDAY_SLOTS = [
  "11:00", "11:40", "12:20", "13:00", "13:40", "14:20",
  "15:00", "15:40", "16:20", "17:00", "17:40", "18:20",
  "19:00", "19:40", "20:20", "21:00",
];

// Weekend (Sat-Sun): 10:00 AM to 10:00 PM (last slot must end by 10 PM)
// Each slot is 40 min (30 min play + 10 min setup)
export const WEEKEND_SLOTS = [
  "10:00", "10:40", "11:20", "12:00", "12:40", "13:20",
  "14:00", "14:40", "15:20", "16:00", "16:40", "17:20",
  "18:00", "18:40", "19:20", "20:00", "20:40", "21:20",
];

export function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr + "T00:00:00");
  const day = getDay(date);
  return day === 0 || day === 6;
}

export function getSlotsForDate(dateStr: string): string[] {
  return isWeekend(dateStr) ? WEEKEND_SLOTS : WEEKDAY_SLOTS;
}

export function formatTimeDisplay(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function generateSlots(
  dateStr: string,
  bookedSlots: string[]
): TimeSlot[] {
  const slots = getSlotsForDate(dateStr);
  const nowIST = toZonedTime(new Date(), TIMEZONE);
  const todayStr = format(nowIST, "yyyy-MM-dd");
  const isToday = dateStr === todayStr;

  return slots.map((time) => {
    const isBooked = bookedSlots.includes(time);
    let isPast = false;

    if (isToday) {
      const [h, m] = time.split(":").map(Number);
      const slotDate = new Date(nowIST);
      slotDate.setHours(h, m, 0, 0);
      isPast = isBefore(slotDate, nowIST);
    }

    return {
      time,
      displayTime: formatTimeDisplay(time),
      status: isBooked || isPast ? "booked" : "available",
    };
  });
}

export function isDateBookable(dateStr: string): boolean {
  const nowIST = toZonedTime(new Date(), TIMEZONE);
  const today = startOfDay(nowIST);
  const date = new Date(dateStr + "T00:00:00");
  const maxDate = addDays(today, 30);

  return !isBefore(date, today) && !isAfter(date, maxDate);
}

export function calculatePrice(
  packageType: PackageType,
  partySize: number
): number {
  return PRICING[packageType] * partySize;
}

export function getPackageForSize(partySize: number): PackageType {
  if (partySize <= 1) return "solo";
  if (partySize <= 5) return "squad";
  return "party";
}

export function getBookableDates(): string[] {
  const nowIST = toZonedTime(new Date(), TIMEZONE);
  const today = startOfDay(nowIST);
  const dates: string[] = [];
  for (let i = 0; i <= 30; i++) {
    dates.push(format(addDays(today, i), "yyyy-MM-dd"));
  }
  return dates;
}

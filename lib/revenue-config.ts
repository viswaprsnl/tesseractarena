// Business-level constants and shared types for the revenue tracker.
// The arena is a ~₹30 lakh capex with ~₹3 lakh/month opex baseline;
// monthly cost is overridable per-month from the admin UI when rent
// or bills change.

export const INVESTMENT_TOTAL = 3_000_000; // ₹30 lakh
export const DEFAULT_MONTHLY_COST = 300_000; // ₹3 lakh

export type RevenueSource = "booking" | "walkin";
export type GroupType = "solo" | "squad" | "party";
export type PaymentMethod = "cash" | "upi" | "card" | "razorpay";

export interface RevenueEntry {
  id: string;
  date: string;
  source: RevenueSource;
  groupType: GroupType;
  players: number;
  revenue: number;
  paymentMethod: PaymentMethod;
  notes: string;
  createdAt: string;
}

export interface DailyAggregate {
  date: string;
  bookingRevenue: number;
  walkinRevenue: number;
  totalRevenue: number;
  bookingPlayers: number;
  walkinPlayers: number;
  bookingSessions: number;
  walkinSessions: number;
}

export interface MonthlyCost {
  month: string;
  cost: number;
  updatedAt: string;
}

// A rupee amount → "₹1.5L" / "₹47k" style compact label for chart axes and
// summary tiles. Below 1000 renders raw so ₹499 doesn't become "0k".
export function formatIndianCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(2)}Cr`;
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}k`;
  return `${sign}₹${abs}`;
}

// Fully-formatted long form for tile displays: "₹1,52,000".
export function formatIndianFull(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

// Aggregate an entry list into daily buckets sorted ascending.
// Days with zero activity are filled in as long as the range spans them,
// so line/bar charts render a continuous X axis without gaps.
export function aggregateByDay(
  entries: RevenueEntry[],
  fromDate: string,
  toDate: string
): DailyAggregate[] {
  const buckets = new Map<string, DailyAggregate>();

  const start = new Date(fromDate + "T00:00:00Z");
  const end = new Date(toDate + "T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      bookingRevenue: 0,
      walkinRevenue: 0,
      totalRevenue: 0,
      bookingPlayers: 0,
      walkinPlayers: 0,
      bookingSessions: 0,
      walkinSessions: 0,
    });
  }

  for (const e of entries) {
    const bucket = buckets.get(e.date);
    if (!bucket) continue;
    if (e.source === "booking") {
      bucket.bookingRevenue += e.revenue;
      bucket.bookingPlayers += e.players;
      bucket.bookingSessions += 1;
    } else {
      bucket.walkinRevenue += e.revenue;
      bucket.walkinPlayers += e.players;
      bucket.walkinSessions += 1;
    }
    bucket.totalRevenue = bucket.bookingRevenue + bucket.walkinRevenue;
  }

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

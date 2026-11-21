import { NextRequest, NextResponse } from "next/server";
import { addMonths, format, getDaysInMonth } from "date-fns";
import { roleForPin } from "@/lib/admin-auth";
import { allGames } from "@/data/games";
import { listBookingRows } from "@/lib/google-sheets";
import { listExpenses, listPayments } from "@/lib/ledger-sheets";
import { listWalkinRevenue } from "@/lib/revenue-sheets";
import { listDetails } from "@/lib/details-sheets";
import { getOps, getPricing } from "@/lib/settings-sheets";
import { getTodayISTString } from "@/lib/booking-config";
import { COLLECTED_VIA, type BookingRow } from "@/lib/booking-types";
import { EXPENSE_CATEGORIES, MONTHLY_BILLS, type ExpenseCategory } from "@/lib/revenue-config";
import { eventBill, gameFee, platformOf, type BookingDetails, type Ops } from "@/lib/ops-config";
import type { Pricing } from "@/lib/pricing";

// GET ?month=YYYY-MM — everything Owner → Overview shows, ex-GST unless
// named "incl". Money counts on the day it was received (Payments sheet,
// like the calendar); plays and game fees on the session date.
//
// Profit = ticket revenue + (food sold − paid to food partner)
//          − game platform fees − every other expense.
// Food sold isn't revenue: it's money passed through to the food partner.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (roleForPin(searchParams.get("pin")) !== "owner") {
    return NextResponse.json({ error: "Owner PIN required" }, { status: 401 });
  }
  const month = searchParams.get("month") || "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }

  try {
    const [rows, payments, walkins, expenses, details, ops, pricing] = await Promise.all([
      listBookingRows((b) => b.status !== "cancelled"),
      listPayments(),
      listWalkinRevenue().catch(() => []),
      listExpenses(),
      listDetails(),
      getOps(),
      getPricing(),
    ]);
    const data = { bookings: rows.map((r) => r.booking), payments, walkins, expenses, details, ops, pricing };

    // Compare like with like: this month so far vs the same dates last month.
    const today = getTodayISTString();
    const first = new Date(`${month}-01T00:00:00`);
    const lastDay = today.startsWith(month) ? Number(today.slice(8)) : getDaysInMonth(first);
    const prevMonth = format(addMonths(first, -1), "yyyy-MM");
    const prevLast = Math.min(lastDay, getDaysInMonth(addMonths(first, -1)));

    const current = summarise(data, month, getDaysInMonth(first));
    const prev = summarise(data, prevMonth, prevLast);
    const sameDates = summarise(data, month, lastDay);
    return NextResponse.json({ ...current, compare: { days: lastDay, now: sameDates.kpi, prev: prev.kpi, prevGames: prev.games } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to load overview", details: message }, { status: 500 });
  }
}

interface Data {
  bookings: BookingRow[];
  payments: Awaited<ReturnType<typeof listPayments>>;
  walkins: Awaited<ReturnType<typeof listWalkinRevenue>>;
  expenses: Awaited<ReturnType<typeof listExpenses>>;
  details: Map<string, BookingDetails>;
  ops: Ops;
  pricing: Pricing;
}

// Share of a booking's ex-GST amount billed at 5% (food, cake) vs 18%.
function foodShare(b: BookingRow, d: BookingDetails | undefined, ops: Ops, pricing: Pricing): number {
  if (!d?.kind || !b.amount) return 0;
  return eventBill(b.partySize, d, ops, pricing).at5 / b.amount;
}

function summarise({ bookings, payments, walkins, expenses, details, ops, pricing }: Data, month: string, lastDay: number) {
  const inRange = (date: string) => date.startsWith(month) && Number(date.slice(8)) <= lastDay;
  const days = Array.from({ length: getDaysInMonth(new Date(`${month}-01T00:00:00`)) }, (_, i) => ({
    date: `${month}-${String(i + 1).padStart(2, "0")}`,
    in: 0, // incl. GST
    out: 0, // day-to-day costs + game fees
    gst: 0,
  }));
  const day = (date: string) => days[Number(date.slice(8)) - 1];
  const byId = new Map(bookings.map((b) => [b.bookingId, b]));
  let receivedEx = 0, foodIn = 0, gst18 = 0, gst5 = 0;
  const methods: Record<string, number> = {};

  const receive = (date: string, ex: number, method: string, share5: number) => {
    if (!inRange(date) || ex <= 0) return;
    const g18 = ex * (1 - share5) * 0.18, g5 = ex * share5 * 0.05;
    receivedEx += ex;
    foodIn += ex * share5;
    gst18 += g18;
    gst5 += g5;
    day(date).in += ex + g18 + g5;
    day(date).gst += g18 + g5;
    methods[method] = (methods[method] || 0) + ex + g18 + g5;
  };

  const ledgered = new Map<string, number>();
  for (const p of payments) {
    ledgered.set(p.bookingId, (ledgered.get(p.bookingId) || 0) + p.amount);
    const b = byId.get(p.bookingId);
    receive(p.date, p.amount, p.method, b ? foodShare(b, details.get(b.bookingId), ops, pricing) : 0);
  }

  let sessions = 0, players = 0, fees = 0, untracked = 0;
  const sources: Record<string, number> = {};
  const games: Record<string, { plays: number; fee: number }> = {};
  for (const b of bookings) {
    // Money paid before the Payments ledger existed counts on the session date.
    const d = details.get(b.bookingId);
    receive(b.date, b.amountPaid - (ledgered.get(b.bookingId) || 0), b.razorpayPaymentId ? "razorpay" : "unrecorded", foodShare(b, d, ops, pricing));
    if (!inRange(b.date) || b.status === "no_show") continue;
    sessions += 1;
    players += b.partySize;
    sources[b.source] = (sources[b.source] || 0) + 1;
    if (!d?.games) {
      if (b.status === "checked_in" || b.status === "completed") untracked += 1;
      continue;
    }
    for (const [id, n] of Object.entries(d.games)) {
      const fee = gameFee(id, n, ops, pricing, b.source === "birthday");
      fees += fee;
      day(b.date).out += fee;
      const g = (games[id] ??= { plays: 0, fee: 0 });
      g.plays += n;
      g.fee += fee;
    }
  }
  for (const w of walkins) {
    receive(w.date, w.revenue, w.paymentMethod, 0);
    if (!inRange(w.date)) continue;
    sessions += 1;
    players += w.players;
    sources.walkin = (sources.walkin || 0) + 1;
  }

  const costs: Record<string, number> = {};
  let foodOut = 0, otherExpenses = 0, monthlyBills = 0;
  for (const e of expenses) {
    if (!inRange(e.date)) continue;
    costs[e.category] = (costs[e.category] || 0) + e.amount;
    if (e.category === "food") foodOut += e.amount;
    else otherExpenses += e.amount;
    if (MONTHLY_BILLS.includes(e.category)) monthlyBills += e.amount;
    else day(e.date).out += e.amount;
  }

  const r = Math.round;
  const tickets = receivedEx - foodIn;
  const profit = tickets + (foodIn - foodOut) - fees - otherExpenses;
  const label = (k: string) => EXPENSE_CATEGORIES[k as ExpenseCategory] ?? k;
  return {
    month,
    daily: days.map((x) => ({ date: x.date, in: r(x.in), out: r(x.out), gst: r(x.gst) })),
    kpi: { received: r(receivedEx + gst18 + gst5), profit: r(profit), gst: r(gst18 + gst5), sessions, players },
    waterfall: { tickets: r(tickets), foodMargin: r(foodIn - foodOut), fees: r(fees), expenses: r(otherExpenses), profit: r(profit) },
    totals: { foodIn: r(foodIn), foodOut: r(foodOut), monthlyBills: r(monthlyBills), out: r(foodOut + otherExpenses + fees) },
    gst: { play: r(gst18), food: r(gst5) },
    costs: [...Object.entries(costs).map(([k, v]) => [label(k), v] as const), ["Game platform fees", r(fees)] as const]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]),
    methods: Object.entries(methods)
      .map(([k, v]) => [COLLECTED_VIA[k as keyof typeof COLLECTED_VIA] ?? (k === "unrecorded" ? "Not recorded" : k), r(v)] as const)
      .sort((a, b) => b[1] - a[1]),
    sources: Object.entries(sources).sort((a, b) => b[1] - a[1]),
    games: Object.entries(games)
      .map(([id, g]) => ({ id, title: allGames.find((x) => x.id === id)?.title ?? id, platform: platformOf(id), plays: g.plays, fee: r(g.fee) }))
      .sort((a, b) => b.plays - a.plays),
    untracked,
  };
}

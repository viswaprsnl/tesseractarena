import { NextRequest, NextResponse } from "next/server";
import { roleForPin } from "@/lib/admin-auth";
import { listBookingRows } from "@/lib/google-sheets";
import { listExpenses, listPayments } from "@/lib/ledger-sheets";
import { listWalkinRevenue } from "@/lib/revenue-sheets";
import type { CalendarDay } from "@/lib/revenue-config";

// GET ?month=YYYY-MM — one row per day plus month totals for the admin
// calendar. Plays are counted on the session date; money on the day it
// was collected (Payments sheet). Amounts are ex-GST.
//
// Older data has no Payments rows, so whatever a booking shows as paid
// beyond its ledger entries is counted on its session date, and legacy
// Revenue-sheet walk-ins count as plays + money on their own date.
// Expenses are only returned to the owner.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const role = roleForPin(searchParams.get("pin"));
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = searchParams.get("month") || "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }

  try {
    const inMonth = (date: string) => date.startsWith(month);
    const [rows, payments, walkins, expenses] = await Promise.all([
      listBookingRows((b) => b.status !== "cancelled"),
      listPayments(),
      listWalkinRevenue().catch(() => []),
      role === "owner" ? listExpenses() : Promise.resolve([]),
    ]);

    const days = new Map<string, CalendarDay>();
    const day = (date: string) => {
      let d = days.get(date);
      if (!d) days.set(date, (d = { date, sessions: 0, players: 0, booked: 0, received: 0, expenses: 0 }));
      return d;
    };
    const byMethod: Record<string, number> = {};
    const bySource: Record<string, { sessions: number; booked: number }> = {};
    const byCategory: Record<string, number> = {};
    const receive = (date: string, amount: number, method: string) => {
      day(date).received += amount;
      byMethod[method] = (byMethod[method] || 0) + amount;
    };
    const play = (date: string, players: number, booked: number, source: string) => {
      const d = day(date);
      d.sessions += 1;
      d.players += players;
      d.booked += booked;
      const s = (bySource[source] ??= { sessions: 0, booked: 0 });
      s.sessions += 1;
      s.booked += booked;
    };

    const ledgered = new Map<string, number>();
    for (const p of payments) {
      ledgered.set(p.bookingId, (ledgered.get(p.bookingId) || 0) + p.amount);
      if (inMonth(p.date)) receive(p.date, p.amount, p.method);
    }
    for (const { booking: b } of rows) {
      if (!inMonth(b.date)) continue;
      play(b.date, b.partySize, b.amount, b.source);
      const unledgered = b.amountPaid - (ledgered.get(b.bookingId) || 0);
      if (unledgered > 0) receive(b.date, unledgered, b.razorpayPaymentId ? "razorpay" : "unrecorded");
    }
    for (const w of walkins) {
      if (!inMonth(w.date)) continue;
      play(w.date, w.players, w.revenue, "walkin");
      receive(w.date, w.revenue, w.paymentMethod);
    }
    for (const e of expenses) {
      if (!inMonth(e.date)) continue;
      day(e.date).expenses += e.amount;
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    }

    const list = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
    // Staff see plays only; money stays with the owner.
    const shown = role === "owner" ? list : list.map((d) => ({ ...d, booked: 0, received: 0 }));
    const sum = (k: keyof Omit<CalendarDay, "date">) => shown.reduce((s, d) => s + d[k], 0);
    return NextResponse.json({
      role,
      days: shown,
      totals: {
        sessions: sum("sessions"),
        players: sum("players"),
        booked: sum("booked"),
        received: sum("received"),
        expenses: sum("expenses"),
        byMethod: role === "owner" ? byMethod : {},
        bySource: role === "owner" ? bySource : Object.fromEntries(Object.entries(bySource).map(([k, v]) => [k, { ...v, booked: 0 }])),
        byCategory,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to load calendar", details: message }, { status: 500 });
  }
}

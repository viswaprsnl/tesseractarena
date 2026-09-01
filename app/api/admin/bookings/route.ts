import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import type { BookingRow } from "@/lib/booking-types";
import { findBookingById, updateBookingCells } from "@/lib/google-sheets";

function getAuth() {
  const privateKey = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "",
    "base64"
  ).toString("utf-8");

  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function GET(request: NextRequest) {
  try {
    // Simple password protection
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get("pin");
    const adminPin = process.env.ADMIN_PIN || "1234";

    if (pin !== adminPin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const date = searchParams.get("date");

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A2:T",
    });

    const rows = (res.data.values || []) as string[][];

    let bookings = rows.map((row): BookingRow => {
      const partySize = parseInt(row[7] || "1");
      const amount = parseInt(row[14] || "0");
      const paymentStatus = (row[10] || "pending") as BookingRow["paymentStatus"];
      // Legacy rows (created before columns S/T existed) fall back to a
      // computed advance derived from paymentStatus + party size + total.
      const rawPaid = row[18];
      const amountPaid =
        rawPaid !== undefined && rawPaid !== ""
          ? parseInt(rawPaid)
          : paymentStatus === "paid"
          ? Math.min(500 * partySize, amount)
          : 0;
      const rawBalance = row[19];
      const balanceDue =
        rawBalance !== undefined && rawBalance !== ""
          ? parseInt(rawBalance)
          : Math.max(0, amount - amountPaid);
      return {
        bookingId: row[0] || "",
        arenaId: row[1] || "arena-1",
        name: row[2] || "",
        email: row[3] || "",
        phone: row[4] || "",
        date: row[5] || "",
        timeSlot: row[6] || "",
        partySize,
        package: (row[8] || "solo") as BookingRow["package"],
        gamePreference: row[9] || "",
        paymentStatus,
        paymentMethod: (row[11] || "pay_at_center") as BookingRow["paymentMethod"],
        razorpayOrderId: row[12] || "",
        razorpayPaymentId: row[13] || "",
        amount,
        specialRequests: row[15] || "",
        createdAt: row[16] || "",
        status: (row[17] || "confirmed") as BookingRow["status"],
        amountPaid,
        balanceDue,
      };
    });

    // Filter by date if provided
    if (date) {
      bookings = bookings.filter((b) => b.date === date);
    }

    // Sort by date and time
    bookings.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.timeSlot.localeCompare(b.timeSlot);
    });

    // Stats
    const active = bookings.filter((b) => b.status !== "cancelled");
    const totalRevenue = active.reduce((sum, b) => sum + b.amount, 0);
    const paid = active.filter((b) => b.paymentStatus === "paid");
    const payAtCenter = active.filter((b) => b.paymentStatus === "pay_at_center");

    return NextResponse.json({
      bookings,
      stats: {
        total: bookings.length,
        active: active.length,
        cancelled: bookings.length - active.length,
        paid: paid.length,
        payAtCenter: payAtCenter.length,
        totalRevenue,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch bookings", details: message },
      { status: 500 }
    );
  }
}

// POST — admin actions on a booking. Currently: mark the counter balance
// as collected (customer paid the remainder in cash/UPI at the arena).
// Body: { pin, action: "mark_balance_paid", bookingId }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const adminPin = process.env.ADMIN_PIN || "1234";
    if (body.pin !== adminPin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { action, bookingId } = body;
    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const hit = await findBookingById(bookingId);
    if (!hit) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (action === "mark_balance_paid") {
      if (hit.booking.status === "cancelled") {
        return NextResponse.json(
          { error: "Cannot collect balance on a cancelled booking" },
          { status: 400 }
        );
      }
      await updateBookingCells(hit.rowIndex, {
        amountPaid: String(hit.booking.amount),
        balanceDue: "0",
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Action failed", details: message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import type { BookingRow } from "@/lib/booking-types";

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
      range: "Sheet1!A2:R",
    });

    const rows = (res.data.values || []) as string[][];

    let bookings = rows.map((row): BookingRow => ({
      bookingId: row[0] || "",
      arenaId: row[1] || "arena-1",
      name: row[2] || "",
      email: row[3] || "",
      phone: row[4] || "",
      date: row[5] || "",
      timeSlot: row[6] || "",
      partySize: parseInt(row[7] || "1"),
      package: (row[8] || "solo") as BookingRow["package"],
      gamePreference: row[9] || "",
      paymentStatus: (row[10] || "pending") as BookingRow["paymentStatus"],
      paymentMethod: (row[11] || "pay_at_center") as BookingRow["paymentMethod"],
      razorpayOrderId: row[12] || "",
      razorpayPaymentId: row[13] || "",
      amount: parseInt(row[14] || "0"),
      specialRequests: row[15] || "",
      createdAt: row[16] || "",
      status: (row[17] || "confirmed") as BookingRow["status"],
    }));

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

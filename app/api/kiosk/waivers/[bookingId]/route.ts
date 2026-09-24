import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { verifyKioskSession } from "@/lib/kiosk-session";
import { findBookingById } from "@/lib/google-sheets";

// Single-booking waiver count. Used by the check-in page's polling
// loop — cheaper than re-fetching the whole roster every few seconds
// while the customer is scanning the QR and signing on their phone.
// Read-only; no mutations.

function getAuth() {
  const privateKey = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "",
    "base64"
  ).toString("utf-8");
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  if (!(await verifyKioskSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;
  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  try {
    const [booking, waiverCount] = await Promise.all([
      findBookingById(bookingId),
      countWaivers(bookingId),
    ]);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const total = booking.booking.partySize;
    const status =
      waiverCount === 0
        ? "pending"
        : waiverCount >= total
        ? "ready"
        : "partial";

    return NextResponse.json({
      bookingId,
      partySize: total,
      waiversSigned: waiverCount,
      status,
      name: booking.booking.name,
      timeSlot: booking.booking.timeSlot,
      gamePreference: booking.booking.gamePreference,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Kiosk waivers error:", message);
    return NextResponse.json(
      { error: "Failed to check waivers" },
      { status: 500 }
    );
  }
}

async function countWaivers(bookingId: string): Promise<number> {
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      range: "Waivers!L2:L",
    });
    const rows = (res.data.values || []) as string[][];
    return rows.reduce(
      (n, row) => ((row[0] || "").trim() === bookingId ? n + 1 : n),
      0
    );
  } catch {
    return 0;
  }
}

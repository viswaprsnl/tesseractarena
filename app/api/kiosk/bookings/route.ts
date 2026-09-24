import { NextResponse } from "next/server";
import { google } from "googleapis";
import { verifyKioskSession } from "@/lib/kiosk-session";
import { getBookingsForDate } from "@/lib/google-sheets";
import { getTodayISTString, formatTimeDisplay } from "@/lib/booking-config";

// Kiosk roster feed. Returns every non-cancelled booking whose date is
// TODAY in IST, plus the count of waivers already signed against each
// booking id so the tab can render "3 of 5 signed" / "Ready ✓". Read-
// only; never mutates a booking.

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

// Waiver counts per booking id from the Waivers sheet (column L is
// booking_id, per the /api/waiver schema). Returned as a Map so we
// can look up in O(1) while walking the roster.
async function loadWaiverCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      range: "Waivers!L2:L",
    });
    const rows = (res.data.values || []) as string[][];
    for (const row of rows) {
      const bid = (row[0] || "").trim();
      if (!bid) continue;
      counts.set(bid, (counts.get(bid) || 0) + 1);
    }
  } catch {
    // Waivers sheet may not exist yet on a fresh install — treat as
    // zero waivers rather than 500ing the whole roster.
  }
  return counts;
}

export async function GET() {
  if (!(await verifyKioskSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = getTodayISTString();
    const [bookings, waivers] = await Promise.all([
      getBookingsForDate(today),
      loadWaiverCounts(),
    ]);

    const roster = bookings
      .map((b) => {
        const signed = waivers.get(b.bookingId) || 0;
        const total = b.partySize;
        // Three states drive the badge on the roster tile: no waivers
        // yet (Pending), some but not all (Partial), everyone signed
        // (Ready). We compare signed >= total (not ===) so a booking
        // with an extra guest waiver still resolves to Ready.
        const status =
          signed === 0
            ? "pending"
            : signed >= total
            ? "ready"
            : "partial";
        return {
          bookingId: b.bookingId,
          name: b.name,
          timeSlot: b.timeSlot,
          timeDisplay: formatTimeDisplay(b.timeSlot),
          partySize: total,
          waiversSigned: signed,
          package: b.package,
          gamePreference: b.gamePreference,
          paymentStatus: b.paymentStatus,
          status,
        };
      })
      // Order by time-of-day so morning slots sit at the top.
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

    return NextResponse.json({ date: today, bookings: roster });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Kiosk bookings error:", message);
    return NextResponse.json(
      { error: "Failed to load bookings" },
      { status: 500 }
    );
  }
}

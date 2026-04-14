import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getBookedSlotsForDate } from "@/lib/google-sheets";
import { generateSlots, isDateBookable } from "@/lib/booking-config";

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

async function getScheduleBlock(date: string): Promise<{
  type: string;
  blockedSlots: string[];
  reason: string;
} | null> {
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      range: "Schedule!A2:E",
    });
    const rows = (res.data.values || []) as string[][];
    const row = rows.find((r) => r[0] === date);
    if (!row || !row[1]) return null;
    return {
      type: row[1],
      blockedSlots: row[2] ? row[2].split(",") : [],
      reason: row[3] || "",
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const arena = searchParams.get("arena") || "arena-1";

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (!isDateBookable(date)) {
      return NextResponse.json(
        { error: "Date is not bookable" },
        { status: 400 }
      );
    }

    // Check if day is blocked
    const block = await getScheduleBlock(date);
    if (block?.type === "day_blocked") {
      return NextResponse.json(
        {
          date,
          dayType: "blocked",
          arena,
          slots: [],
          blocked: true,
          reason: block.reason || "This day is not available for booking",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Get booked slots + admin-blocked slots
    const bookedSlots = await getBookedSlotsForDate(date, arena);
    const adminBlockedSlots = block?.type === "slots_blocked" ? block.blockedSlots : [];
    const allBlockedSlots = [...new Set([...bookedSlots, ...adminBlockedSlots])];

    const slots = generateSlots(date, allBlockedSlots);

    const dayOfWeek = new Date(date + "T00:00:00").getDay();
    const dayType = dayOfWeek === 0 || dayOfWeek === 6 ? "weekend" : "weekday";

    return NextResponse.json(
      { date, dayType, arena, slots, blocked: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error fetching slots:", message);
    return NextResponse.json(
      { error: "Failed to fetch available slots", details: message },
      { status: 500 }
    );
  }
}

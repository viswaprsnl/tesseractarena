import { NextRequest, NextResponse } from "next/server";
import { getBookedSlotsForDate } from "@/lib/google-sheets";
import { generateSlots, isDateBookable } from "@/lib/booking-config";

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

    const bookedSlots = await getBookedSlotsForDate(date, arena);
    const slots = generateSlots(date, bookedSlots);

    const dayOfWeek = new Date(date + "T00:00:00").getDay();
    const dayType = dayOfWeek === 0 || dayOfWeek === 6 ? "weekend" : "weekday";

    return NextResponse.json(
      { date, dayType, arena, slots },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    );
  }
}

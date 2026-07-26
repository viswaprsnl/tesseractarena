import { NextRequest, NextResponse } from "next/server";
import { listDiscounts } from "@/lib/discount-sheets";

// Public endpoint used by the booking flow. Returns every discount that is
// active AND in-window for the given session date; client-side code uses
// pickActiveDiscount() to select the best one per package.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const all = await listDiscounts();
    const applicable = all
      .filter((d) => d.active && d.startsOn <= date && d.endsOn >= date)
      .map((d) => ({
        id: d.id,
        label: d.label,
        type: d.type,
        value: d.value,
        appliesTo: d.appliesTo,
        // Sheet's own start/end retained so client-side pickActiveDiscount
        // can reuse the exact same filter logic as the server.
        startsOn: d.startsOn,
        endsOn: d.endsOn,
        active: d.active,
      }));

    return NextResponse.json(
      { discounts: applicable },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error fetching discounts:", message);
    return NextResponse.json(
      { error: "Failed to fetch discounts", details: message },
      { status: 500 }
    );
  }
}

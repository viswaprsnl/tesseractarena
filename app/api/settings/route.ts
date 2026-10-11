import { NextResponse } from "next/server";
import { getAdvanceRequired } from "@/lib/settings-sheets";

// Public read-only slice of the settings sheet. Returns only the
// flags the client needs to render the booking flow — never the full
// settings table (that includes updatedBy / audit info that doesn't
// belong in a public JSON response).
//
// Called by the booking wizard on mount so the Payment step knows
// whether to show the Pay Online button or go straight to Pay at
// Center.
export async function GET() {
  try {
    const advanceRequired = await getAdvanceRequired();
    return NextResponse.json({ advanceRequired });
  } catch (error) {
    // On a sheet-read failure, default to the SAFER state (advance
    // required) so a transient outage doesn't accidentally run the
    // no-advance experiment on a day it shouldn't.
    console.error("Public settings read failed:", error);
    return NextResponse.json({ advanceRequired: true });
  }
}

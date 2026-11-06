import { NextResponse } from "next/server";
import {
  getAdvanceRequired,
  getHalloweenMode,
  getDiwaliMode,
} from "@/lib/settings-sheets";

// Public read-only slice of the settings sheet. Returns only the
// flags the client needs to render the booking flow or seasonal
// chrome — never the full settings table (that includes updatedBy /
// audit info that doesn't belong in a public JSON response).
//
// Called by the booking wizard on mount (advanceRequired) and by the
// SiteChrome's seasonal overlay (halloweenMode) so a staff flip
// propagates within ~60s without a redeploy.
export async function GET() {
  try {
    const [advanceRequired, halloweenMode, diwaliMode] = await Promise.all([
      getAdvanceRequired(),
      getHalloweenMode(),
      getDiwaliMode(),
    ]);
    return NextResponse.json({ advanceRequired, halloweenMode, diwaliMode });
  } catch (error) {
    // On a sheet-read failure, default to the SAFER state: advance
    // REQUIRED (so a transient outage doesn't accidentally run the
    // no-advance experiment), seasonal overlays OFF (chrome is only
    // ever opt-in; if we can't read the flag, don't guess).
    console.error("Public settings read failed:", error);
    return NextResponse.json({
      advanceRequired: true,
      halloweenMode: false,
      diwaliMode: false,
    });
  }
}

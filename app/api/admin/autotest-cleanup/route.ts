import { NextRequest, NextResponse } from "next/server";
import {
  clearBookingRow,
  listBookingRows,
} from "@/lib/google-sheets";
import {
  listWalkinRevenue,
  deleteWalkinRevenue,
} from "@/lib/revenue-sheets";
import {
  AUTOTEST_RETENTION_DAYS,
  isAutotestRequest,
  isAutotestRow,
} from "@/lib/autotest";

// Bookings currently write createdAt as date-fns `format(toZonedTime(…),
// "yyyy-MM-dd'T'HH:mm:ssxxx")`, which emits the SYSTEM's TZ offset
// rather than IST's +05:30. On a Vercel server (UTC) the offset comes
// out as +00:00 even though the HH:mm:ss is IST wall-clock — so a
// naive Date.parse of that string gives a UTC ms five-and-a-half
// hours in the past. For "older than N" comparisons the resulting
// times are off by half a day in weird environments. Rather than
// chase the writer bug (used by every downstream reader), we
// re-interpret the wall-clock portion as IST here, which is what the
// writer intended. Walk-in rows use `new Date().toISOString()` and
// are safe to Date.parse directly.
function parseCreatedAt(createdAt: string): number {
  // ISO-with-Z (walk-ins) is unambiguous — fast path.
  if (/Z$/.test(createdAt)) return Date.parse(createdAt);
  // Pull out the YYYY-MM-DDTHH:MM:SS prefix and re-anchor it to IST.
  const m = createdAt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);
  if (!m) return Date.parse(createdAt);
  return Date.parse(`${m[1]}T${m[2]}+05:30`);
}

// Nightly cleanup for the smoke-test harness. The GitHub Actions
// workflow calls this BEFORE running the suite each night so a run
// starts from a clean slate — any test rows older than
// AUTOTEST_RETENTION_DAYS (default 7) get swept from Sheet1 and the
// Revenue sheet. The retention window is long enough that a failed
// run from last night is still debuggable this morning but short
// enough that the sheets never bloat with months of test traffic.
//
// Guarded by the same AUTOTEST_TOKEN header as the booking/walk-in
// bypasses — one secret, one surface area to protect. If the env var
// isn't set on the server this endpoint 401s on every request, so a
// misconfigured preview deploy can't be used to wipe real rows.
export async function POST(request: NextRequest) {
  if (!isAutotestRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Age override: ?olderThanHours=0 wipes every tagged row right
    // now, used by local verification and by the one-off manual sweep
    // documented in tests/README.md. Default is the 7-day production
    // retention window used by the nightly workflow.
    const olderThanHoursParam = new URL(request.url).searchParams.get("olderThanHours");
    const olderThanHours =
      olderThanHoursParam !== null && /^\d+$/.test(olderThanHoursParam)
        ? parseInt(olderThanHoursParam, 10)
        : AUTOTEST_RETENTION_DAYS * 24;
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;

    // Sheet1 bookings — [AUTOTEST] marker in specialRequests OR
    // autotest+* email prefix. Then filter by age.
    const testBookings = await listBookingRows((b) =>
      isAutotestRow(b.email, b.specialRequests)
    );
    const expiredBookings = testBookings.filter((b) => {
      const createdMs = parseCreatedAt(b.booking.createdAt);
      return Number.isFinite(createdMs) && createdMs < cutoff;
    });
    for (const b of expiredBookings) {
      await clearBookingRow(b.rowIndex);
    }

    // Revenue walk-ins — [AUTOTEST] marker in notes. Filter by age.
    const walkins = await listWalkinRevenue();
    const expiredWalkins = walkins.filter((w) => {
      if (!isAutotestRow(undefined, w.notes)) return false;
      const createdMs = parseCreatedAt(w.createdAt);
      return Number.isFinite(createdMs) && createdMs < cutoff;
    });
    for (const w of expiredWalkins) {
      await deleteWalkinRevenue(w.id);
    }

    return NextResponse.json({
      ok: true,
      olderThanHours,
      cutoffIso: new Date(cutoff).toISOString(),
      sweptBookings: expiredBookings.map((b) => b.booking.bookingId),
      sweptWalkins: expiredWalkins.map((w) => w.id),
      liveTestBookings: testBookings.length - expiredBookings.length,
      liveTestWalkins: walkins.filter(
        (w) => isAutotestRow(undefined, w.notes)
      ).length - expiredWalkins.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Autotest cleanup failed:", message);
    return NextResponse.json(
      { error: "Cleanup failed", details: message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getExpiredPayAtCenterBookings, updateBookingCells } from "@/lib/google-sheets";
import { sendCancellationEmail } from "@/lib/email";
import { formatTimeDisplay } from "@/lib/booking-config";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (prevents unauthorized calls)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find pay-at-center bookings older than 4 hours
    const expired = await getExpiredPayAtCenterBookings(4);

    let cancelled = 0;
    for (const { booking, rowIndex } of expired) {
      // Cancel the booking
      await updateBookingCells(rowIndex, { status: "cancelled" });

      // Notify the customer
      try {
        await sendCancellationEmail({
          customerEmail: booking.email,
          customerName: booking.name,
          bookingId: booking.bookingId,
          date: booking.date,
          time: formatTimeDisplay(booking.timeSlot),
        });
      } catch {
        // Continue even if email fails
      }

      cancelled++;
    }

    return NextResponse.json({
      success: true,
      message: `Expired ${cancelled} pay-at-center bookings`,
      cancelled,
      checked: expired.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Cron expire-bookings error:", message);
    return NextResponse.json(
      { error: "Cron job failed", details: message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { findBookingById, updateBookingCells } from "@/lib/google-sheets";
import { sendCancellationEmail } from "@/lib/email";
import { formatTimeDisplay } from "@/lib/booking-config";

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const result = await findBookingById(bookingId);
    if (!result) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (result.booking.status === "cancelled") {
      return NextResponse.json(
        { error: "This booking is already cancelled" },
        { status: 400 }
      );
    }

    // Cancel the booking
    await updateBookingCells(result.rowIndex, {
      status: "cancelled",
    });

    // Send cancellation email
    try {
      await sendCancellationEmail({
        customerEmail: result.booking.email,
        customerName: result.booking.name,
        bookingId: result.booking.bookingId,
        date: result.booking.date,
        time: formatTimeDisplay(result.booking.timeSlot),
      });
    } catch {
      // Email failure shouldn't block cancellation
    }

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully",
      bookingId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error cancelling booking:", message);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}

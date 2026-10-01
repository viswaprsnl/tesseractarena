import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { findBookingById, updateBookingCells } from "@/lib/google-sheets";
import { calculateAdvance } from "@/lib/booking-config";
import { isBirthdayPackage } from "@/lib/booking-types";
import { birthdayAdvance } from "@/data/birthday";
import { sendBookingEmailsFromRow } from "@/lib/email";

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  bookingId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } =
      parsed.data;

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // Update booking in Google Sheets
    const result = await findBookingById(bookingId);
    if (!result) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Already-paid guard: if the Razorpay webhook got there first, do
    // nothing — don't rewrite the sheet row, don't send a second email.
    // Returning success here is safe: the booking is paid; the client
    // just wants acknowledgement so it can route to the confirmation
    // page.
    if (result.booking.paymentStatus === "paid") {
      return NextResponse.json({
        success: true,
        bookingId,
        paymentStatus: "paid",
        already: true,
      });
    }

    // Advance = ₹500 per player for regular sessions, capped at total;
    // BIRTHDAY_ADVANCE_PERCENT of the flat package total for birthdays.
    // Balance = total − advance.
    //
    // All amounts written back to the sheet here are EX-GST — this is the
    // clean revenue basis for Anvio royalty (10% of ex-GST) and internal
    // reporting. Razorpay charged the customer ex-GST × 1.18; the extra
    // 18% is remitted to the government and never sits in our revenue
    // accounting. See lib/booking-config.ts (GST_PERCENT) for the rule.
    const advance = isBirthdayPackage(result.booking.package)
      ? birthdayAdvance(result.booking.amount)
      : calculateAdvance(result.booking.partySize, result.booking.amount);
    await updateBookingCells(result.rowIndex, {
      paymentStatus: "paid",
      razorpayPaymentId: razorpay_payment_id,
      amountPaid: String(advance),
      balanceDue: String(Math.max(0, result.booking.amount - advance)),
    });

    // The booking is only "real" now that payment has cleared. Fire
    // customer + arena-ops emails here, not at /api/bookings create
    // time, so a customer who closes the Razorpay sheet never gets a
    // "Booking Confirmed" email for a session they didn't pay for.
    // Pass the row with its freshly-flipped paymentStatus so the email
    // copy reads correctly ("Advance paid online" rather than "due").
    const bookingForEmail = {
      ...result.booking,
      paymentStatus: "paid" as const,
      razorpayPaymentId: razorpay_payment_id,
      amountPaid: advance,
      balanceDue: Math.max(0, result.booking.amount - advance),
    };
    await sendBookingEmailsFromRow(bookingForEmail);

    return NextResponse.json({
      success: true,
      bookingId,
      paymentStatus: "paid",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}

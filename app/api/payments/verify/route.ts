import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { findBookingById, updateBookingCells } from "@/lib/google-sheets";
import { advanceDue } from "@/lib/pricing";
import { getPricing } from "@/lib/settings-sheets";
import { recordPayment } from "@/lib/ledger-sheets";
import { sendBookingEmailsFromRow } from "@/lib/email";
import { notifyTeam } from "@/lib/notify";

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  bookingId: z.string().min(1),
  // Mirror of the flag passed to /api/payments/create. When true, the
  // sheet row records amountPaid = full amount and balanceDue = 0 so
  // the counter staff never asks the customer for a balance they've
  // already paid online.
  payFull: z.boolean().optional().default(false),
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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, payFull } =
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

    // Advance per lib/pricing.ts; balance = total − advance.
    //
    // All amounts written back to the sheet here are EX-GST — this is the
    // clean revenue basis for Anvio royalty (10% of ex-GST) and internal
    // reporting. Razorpay charged the customer ex-GST × 1.18; the extra
    // 18% is remitted to the government and never sits in our revenue
    // accounting. See lib/booking-config.ts (GST_PERCENT) for the rule.
    const chargeBase = payFull
      ? result.booking.amount
      : advanceDue(await getPricing(), result.booking);
    await updateBookingCells(result.rowIndex, {
      paymentStatus: "paid",
      razorpayPaymentId: razorpay_payment_id,
      amountPaid: String(chargeBase),
      balanceDue: String(Math.max(0, result.booking.amount - chargeBase)),
    });
    await recordPayment({ bookingId, amount: chargeBase, method: "razorpay", ref: razorpay_payment_id });

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
      amountPaid: chargeBase,
      balanceDue: Math.max(0, result.booking.amount - chargeBase),
    };
    await sendBookingEmailsFromRow(bookingForEmail);
    await notifyTeam("paid", bookingForEmail);

    return NextResponse.json({
      success: true,
      bookingId,
      paymentStatus: "paid",
      amountPaid: chargeBase,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}

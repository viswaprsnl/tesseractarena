import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { findBookingById, updateBookingCells } from "@/lib/google-sheets";

// Verify the Razorpay signature for a BALANCE payment and flip the
// sheet row to fully paid. Separate from /api/payments/verify so the
// semantics are explicit: this always goes to amountPaid=amount,
// balanceDue=0 regardless of what the row previously held.
//
// Idempotent: if the row is already fully paid (webhook beat us here)
// we still return success so the client lands on its "paid" screen.

const verifyBalanceSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  bookingId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyBalanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } =
      parsed.data;

    const sigOk = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    if (!sigOk) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    const result = await findBookingById(bookingId);
    if (!result) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Idempotency: webhook may have landed first.
    if (result.booking.balanceDue === 0) {
      return NextResponse.json({
        success: true,
        bookingId,
        alreadyPaid: true,
      });
    }

    // Full amount is now captured — the advance was already in
    // amountPaid, and the balance just cleared, so the two together
    // equal `amount`. We write amountPaid=amount directly rather than
    // amountPaid+=balanceDue because it's one less chance to drift
    // if a legacy row had a mis-set amountPaid.
    await updateBookingCells(result.rowIndex, {
      razorpayPaymentId: razorpay_payment_id,
      amountPaid: String(result.booking.amount),
      balanceDue: "0",
    });

    return NextResponse.json({
      success: true,
      bookingId,
      amountPaid: result.booking.amount,
      balanceDue: 0,
    });
  } catch (error) {
    console.error("Balance verify failed:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}

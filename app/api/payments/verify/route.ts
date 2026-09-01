import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { findBookingById, updateBookingCells } from "@/lib/google-sheets";
import { calculateAdvance } from "@/lib/booking-config";

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

    // Advance = ₹500 per player, capped at total. Balance = total − advance.
    const advance = calculateAdvance(
      result.booking.partySize,
      result.booking.amount
    );
    await updateBookingCells(result.rowIndex, {
      paymentStatus: "paid",
      razorpayPaymentId: razorpay_payment_id,
      amountPaid: String(advance),
      balanceDue: String(Math.max(0, result.booking.amount - advance)),
    });

    // Send payment confirmation email
    try {
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: process.env.WEB3FORMS_ACCESS_KEY,
          subject: `[Tesseract Arena] Payment Confirmed: ${bookingId}`,
          from_name: "Tesseract Arena",
          email: result.booking.email,
          message: `Payment of ₹${result.booking.amount} received for booking ${bookingId}. See you on ${result.booking.date}!`,
        }),
      });
    } catch {
      // Email failure shouldn't block
    }

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

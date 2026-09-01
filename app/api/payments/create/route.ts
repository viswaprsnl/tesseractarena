import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@/lib/razorpay";
import { findBookingById, updateBookingCells } from "@/lib/google-sheets";
import { calculateAdvance } from "@/lib/booking-config";

// The client sends only the bookingId. The amount to charge is derived
// server-side from the booking row so a tampered client cannot short-pay
// or over-charge. Kept `amount` optional in the schema for backwards
// compatibility with any in-flight browsers but the value is ignored.
const createPaymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { bookingId } = parsed.data;

    // Verify booking exists
    const result = await findBookingById(bookingId);
    if (!result) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (result.booking.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "Payment already completed" },
        { status: 400 }
      );
    }

    // Charge only the advance (₹500/person, capped at total). The rest is
    // collected at the arena counter.
    const advance = calculateAdvance(
      result.booking.partySize,
      result.booking.amount
    );

    // Create Razorpay order for the advance amount
    const order = await createOrder(advance, bookingId);

    // Update booking with order ID
    await updateBookingCells(result.rowIndex, {
      razorpayOrderId: order.id,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId,
      prefill: {
        name: result.booking.name,
        email: result.booking.email,
        contact: result.booking.phone,
      },
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}

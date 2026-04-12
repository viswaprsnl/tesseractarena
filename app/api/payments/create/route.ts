import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@/lib/razorpay";
import { findBookingById, updateBookingCells } from "@/lib/google-sheets";

const createPaymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().positive(),
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

    const { bookingId, amount } = parsed.data;

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

    // Create Razorpay order
    const order = await createOrder(amount, bookingId);

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

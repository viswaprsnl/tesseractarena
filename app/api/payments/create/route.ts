import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@/lib/razorpay";
import { findBookingById, updateBookingCells } from "@/lib/google-sheets";
import { calculateAdvance, withGST } from "@/lib/booking-config";
import { isBirthdayPackage } from "@/lib/booking-types";
import { birthdayAdvance } from "@/data/birthday";

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

    // Charge only the advance. Regular sessions collect ₹500/person (capped
    // at total); birthday packages collect BIRTHDAY_ADVANCE_PERCENT of the
    // package total. Rest is settled at the arena counter.
    //
    // `advance` is the ex-GST base — that's what the sheet records so the
    // Anvio royalty and revenue reports stay clean. The customer pays 18%
    // GST on top, which is what Razorpay actually charges via the order.
    const advance = isBirthdayPackage(result.booking.package)
      ? birthdayAdvance(result.booking.amount)
      : calculateAdvance(result.booking.partySize, result.booking.amount);
    const advanceWithGST = withGST(advance);

    // Create Razorpay order for the advance amount (customer-facing gross).
    const order = await createOrder(advanceWithGST, bookingId);

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

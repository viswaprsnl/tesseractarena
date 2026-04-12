import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  getBookedSlotsForDate,
  appendBooking,
  getActiveBookingsByContact,
} from "@/lib/google-sheets";
import { sendBookingConfirmation, sendOwnerNotification } from "@/lib/email";
import {
  calculatePrice,
  isDateBookable,
  getSlotsForDate,
  formatTimeDisplay,
} from "@/lib/booking-config";
import type { BookingRow } from "@/lib/booking-types";

const bookingSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(10).max(15),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
    partySize: z.number().int().min(1).max(10),
    package: z.enum(["solo", "squad", "party"]),
    gamePreference: z.string().min(1),
    paymentMethod: z.enum(["razorpay", "pay_at_center"]),
    specialRequests: z.string().max(500).optional(),
    arenaId: z.string().optional().default("arena-1"),
  })
  .refine(
    (data) => {
      if (data.package === "solo") return data.partySize === 1;
      if (data.package === "squad")
        return data.partySize >= 2 && data.partySize <= 5;
      if (data.package === "party")
        return data.partySize >= 6 && data.partySize <= 10;
      return true;
    },
    { message: "Party size does not match selected package" }
  );

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify date is bookable
    if (!isDateBookable(data.date)) {
      return NextResponse.json(
        { error: "Date is not bookable" },
        { status: 400 }
      );
    }

    // Verify slot exists for this day type
    const validSlots = getSlotsForDate(data.date);
    if (!validSlots.includes(data.timeSlot)) {
      return NextResponse.json(
        { error: "Invalid time slot for this date" },
        { status: 400 }
      );
    }

    // Check booking limit (max 2 active bookings per person)
    const activeBookings = await getActiveBookingsByContact(data.email, data.phone);
    const activePayAtCenter = activeBookings.filter(b => b.paymentMethod === "pay_at_center");
    if (activePayAtCenter.length >= 2 && data.paymentMethod === "pay_at_center") {
      return NextResponse.json(
        { error: "You already have 2 active bookings with Pay at Center. Please pay online or cancel an existing booking first." },
        { status: 429 }
      );
    }
    if (activeBookings.length >= 4) {
      return NextResponse.json(
        { error: "Maximum 4 active bookings allowed per person. Please cancel an existing booking first." },
        { status: 429 }
      );
    }

    // Check for double-booking
    const bookedSlots = await getBookedSlotsForDate(data.date, data.arenaId);
    if (bookedSlots.includes(data.timeSlot)) {
      return NextResponse.json(
        { error: "This slot is already booked. Please select another time." },
        { status: 409 }
      );
    }

    // Generate booking ID
    const bookingId = `TA-${nanoid(6).toUpperCase()}`;
    const amount = calculatePrice(data.package, data.partySize);
    const nowIST = toZonedTime(new Date(), "Asia/Kolkata");
    const createdAt = format(nowIST, "yyyy-MM-dd'T'HH:mm:ssxxx");

    const paymentStatus =
      data.paymentMethod === "pay_at_center" ? "pay_at_center" : "pending";

    const booking: BookingRow = {
      bookingId,
      arenaId: data.arenaId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      date: data.date,
      timeSlot: data.timeSlot,
      partySize: data.partySize,
      package: data.package,
      gamePreference: data.gamePreference,
      paymentStatus,
      paymentMethod: data.paymentMethod,
      razorpayOrderId: "",
      razorpayPaymentId: "",
      amount,
      specialRequests: data.specialRequests || "",
      createdAt,
      status: "confirmed",
    };

    // Save to Google Sheets
    await appendBooking(booking);

    // Send confirmation emails via Resend
    const emailData = {
      customerEmail: data.email,
      customerName: data.name,
      bookingId,
      date: data.date,
      time: formatTimeDisplay(data.timeSlot),
      partySize: data.partySize,
      packageType: data.package,
      amount,
      gamePreference: data.gamePreference,
      paymentMethod: data.paymentMethod,
    };

    let emailError: string | null = null;
    try {
      const [custResult, ownerResult] = await Promise.all([
        sendBookingConfirmation(emailData),
        sendOwnerNotification(emailData),
      ]);
      console.log("Customer email result:", JSON.stringify(custResult));
      console.log("Owner email result:", JSON.stringify(ownerResult));
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
      console.error("Email sending failed:", emailError);
    }

    return NextResponse.json({
      success: true,
      booking: {
        bookingId,
        date: data.date,
        timeSlot: data.timeSlot,
        displayTime: formatTimeDisplay(data.timeSlot),
        partySize: data.partySize,
        package: data.package,
        amount,
        paymentStatus,
        paymentMethod: data.paymentMethod,
      },
      emailError,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

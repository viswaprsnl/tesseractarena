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
  isDateBookable,
  getSlotsForDate,
  formatTimeDisplay,
  gstOn,
} from "@/lib/booking-config";
import type { BookingRow } from "@/lib/booking-types";
import {
  BIRTHDAY_PACKAGES,
  BIRTHDAY_ADDONS,
  birthdayAdvance,
  birthdayRequiredSlots,
} from "@/data/birthday";

// POST body — the birthday wizard sends this shape. Guest count is
// validated against the selected package + optional extra-kid add-on.
const birthdaySchema = z
  .object({
    name: z.string().min(2).max(100),          // Parent name
    email: z.string().email(),
    phone: z.string().min(10).max(15),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
    // Only one package now ("standard"). Legacy ids accepted for a
    // rollout window so a stale client doesn't 400 — they map to
    // "standard" below.
    packageId: z
      .enum(["standard", "essentials", "plus", "ultimate"])
      .default("standard"),
    birthdayKidName: z.string().min(1).max(60),
    birthdayKidAge: z.number().int().min(6).max(18),
    guestCount: z.number().int().min(1).max(24),
    addons: z
      .array(
        z.object({
          id: z.string(),
          qty: z.number().int().min(0).max(24).optional().default(1),
        })
      )
      .optional()
      .default([]),
    specialRequests: z.string().max(500).optional(),
    arenaId: z.string().optional().default("arena-1"),
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = birthdaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Normalise legacy tier ids to the single current "standard"
    // package. The sheet keeps the original birthday-* value on the
    // row through `package: `birthday-${packageId}``, so historical
    // bookings stay traceable; this is purely about pricing.
    const normalizedPackageId: "standard" =
      data.packageId === "essentials" ||
      data.packageId === "plus" ||
      data.packageId === "ultimate"
        ? "standard"
        : data.packageId;
    const pkg = BIRTHDAY_PACKAGES.find((p) => p.id === normalizedPackageId);
    if (!pkg) {
      return NextResponse.json(
        { error: "Unknown birthday package" },
        { status: 400 }
      );
    }

    // Guest count check — must be within the single package's min/max.
    // No more "extra-kid" add-on; max is simply pkg.maxKids.
    if (data.guestCount < pkg.minKids || data.guestCount > pkg.maxKids) {
      return NextResponse.json(
        {
          error: `Guest count must be between ${pkg.minKids} and ${pkg.maxKids} kids.`,
        },
        { status: 400 }
      );
    }

    // Date + slot validation.
    if (!isDateBookable(data.date)) {
      return NextResponse.json(
        { error: "Date is not bookable" },
        { status: 400 }
      );
    }
    const daySlots = getSlotsForDate(data.date);
    const startIdx = daySlots.indexOf(data.timeSlot);
    if (startIdx === -1) {
      return NextResponse.json(
        { error: "Invalid time slot for this date" },
        { status: 400 }
      );
    }
    // Slot requirement comes from baseline + any extendsSlots add-ons
    // (currently just morning-buyout which bumps from 2 to 3 hours).
    const requiredSlots = birthdayRequiredSlots(
      pkg,
      data.addons.map((a) => a.id)
    );
    if (startIdx + requiredSlots > daySlots.length) {
      return NextResponse.json(
        {
          error: `${pkg.name} needs ${requiredSlots} back-to-back slots — please pick an earlier start time.`,
        },
        { status: 400 }
      );
    }

    // Booking cap: reuse the per-contact active-bookings rule so a single
    // parent can't spam bookings.
    const existing = await getActiveBookingsByContact(data.email, data.phone);
    if (existing.length >= 4) {
      return NextResponse.json(
        { error: "Maximum 4 active bookings allowed per person." },
        { status: 429 }
      );
    }

    // Slot availability — every slot the birthday occupies must be free.
    const bookedSlots = await getBookedSlotsForDate(data.date, data.arenaId);
    for (let i = 0; i < requiredSlots; i++) {
      const t = daySlots[startIdx + i];
      if (bookedSlots.includes(t)) {
        return NextResponse.json(
          {
            error: `${formatTimeDisplay(t)} is already taken. This party needs ${requiredSlots} back-to-back slots free.`,
          },
          { status: 409 }
        );
      }
    }

    // Compute total: flat per-kid rate × guestCount + add-ons.
    let addonTotal = 0;
    const addonNotes: string[] = [];
    for (const chosen of data.addons) {
      const def = BIRTHDAY_ADDONS.find((a) => a.id === chosen.id);
      if (!def) continue;
      const qty = chosen.qty ?? 1;
      const cost =
        def.unit === "per-kid"
          ? def.price * data.guestCount  // per-kid add-ons scale with guestCount, not the qty field
          : def.price * (qty > 0 ? 1 : 0);
      if (cost > 0) {
        addonTotal += cost;
        addonNotes.push(
          def.unit === "per-kid"
            ? `${def.label} × ${data.guestCount} kids = ₹${cost}`
            : `${def.label} = ₹${cost}`
        );
      }
    }
    const packageSubtotal = pkg.pricePerKid * data.guestCount;
    const amount = packageSubtotal + addonTotal;
    // No launch discount post-2026-11-05 — the per-kid rate is the final
    // price. If we introduce campaigns later they'd plug in here.
    const discountAmount = 0;
    // 18% GST on the amount, remitted to govt.
    const gstAmount = gstOn(amount);

    const bookingId = `TA-${nanoid(6).toUpperCase()}`;
    const nowIST = toZonedTime(new Date(), "Asia/Kolkata");
    const createdAt = format(nowIST, "yyyy-MM-dd'T'HH:mm:ssxxx");

    // Cram birthday-specific details into existing fields so we don't have
    // to migrate the sheet schema. gamePreference carries the kid label
    // (which is what the admin bookings tab surfaces at a glance).
    const kidLabel = `Birthday: ${data.birthdayKidName} (age ${data.birthdayKidAge})`;
    const notes = [
      addonNotes.length ? `Add-ons: ${addonNotes.join(", ")}` : "",
      data.specialRequests,
    ]
      .filter(Boolean)
      .join(" · ");

    const booking: BookingRow = {
      bookingId,
      arenaId: data.arenaId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      date: data.date,
      timeSlot: data.timeSlot,
      partySize: data.guestCount,
      package: `birthday-${normalizedPackageId}` as BookingRow["package"],
      gamePreference: kidLabel,
      paymentStatus: "pending",
      paymentMethod: "razorpay",
      razorpayOrderId: "",
      razorpayPaymentId: "",
      amount,
      specialRequests: notes,
      createdAt,
      status: "confirmed",
      amountPaid: 0,
      balanceDue: amount,
      gstAmount,
      discountAmount,
    };

    await appendBooking(booking);

    // Best-effort notification emails. We reuse the standard templates —
    // the birthday-specific info shows up in the gamePreference /
    // specialRequests fields the templates already render.
    const emailData = {
      customerEmail: data.email,
      customerName: data.name,
      bookingId,
      date: data.date,
      time: formatTimeDisplay(data.timeSlot),
      partySize: data.guestCount,
      packageType: pkg.name,
      amount,
      gamePreference: kidLabel,
      paymentMethod: "razorpay",
    };
    let emailError: string | null = null;
    try {
      await Promise.all([
        sendBookingConfirmation(emailData),
        sendOwnerNotification(emailData),
      ]);
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
      console.error("Birthday email send failed:", emailError);
    }

    return NextResponse.json({
      success: true,
      booking: {
        bookingId,
        date: data.date,
        timeSlot: data.timeSlot,
        displayTime: formatTimeDisplay(data.timeSlot),
        packageId: data.packageId,
        packageName: pkg.name,
        guestCount: data.guestCount,
        amount,
        advance: birthdayAdvance(amount),
        slotsBlocked: requiredSlots,
      },
      emailError,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Birthday booking error:", message);
    return NextResponse.json(
      { error: "Failed to create birthday booking" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { roleForPin, type AdminRole } from "@/lib/admin-auth";
import {
  appendBooking,
  findBookingById,
  getBookedSlotsForDate,
  listBookingRows,
  updateBookingCells,
} from "@/lib/google-sheets";
import { listWalkinRevenue } from "@/lib/revenue-sheets";
import { isAutotestRequest } from "@/lib/autotest";
import { z } from "zod";
import { nanoid } from "nanoid";
import { formatInTimeZone } from "date-fns-tz";
import type { BookingRow } from "@/lib/booking-types";
import { DECIDE_AT_VENUE_ID, STANDARD_PACKAGE } from "@/lib/booking-types";
import { formatTimeDisplay, getSlotsForDate, gstOn, GST_PERCENT, inclGst } from "@/lib/booking-config";
import { gamePrice, maxGamePrice } from "@/lib/pricing";
import { getOps, getPricing } from "@/lib/settings-sheets";
import { recordPayment } from "@/lib/ledger-sheets";
import { getDetails, listDetails, nextInvoiceNo, saveDetails } from "@/lib/details-sheets";
import { eventBill, FOOD_MENU, type BookingDetails } from "@/lib/ops-config";
import { createPaymentLink } from "@/lib/razorpay";
import { billMessage, billUrl } from "@/lib/bill";
import { sendBillEmail } from "@/lib/email";


const collectedVia = z.enum(["cash", "upi", "card", "bank", "razorpay"]);

export async function GET(request: NextRequest) {
  try {
    // Simple password protection. Autotest also gets through via the
    // AUTOTEST_TOKEN header so the nightly smoke suite can read back
    // its own test rows without needing the real admin PIN embedded
    // in GitHub Secrets.
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get("pin");
    if (!isAutotestRequest(request) && !roleForPin(pin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const date = searchParams.get("date");

    const bookings = (await listBookingRows((b) => !date || b.date === date))
      .map((r) => r.booking)
      .sort((a, b) => a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot));

    // Legacy walk-ins logged in the Revenue sheet before counter sales
    // became real bookings. Read-only; non-blocking if the tab is missing.
    let walkins: Awaited<ReturnType<typeof listWalkinRevenue>> = [];
    try {
      const all = await listWalkinRevenue();
      walkins = date ? all.filter((w) => w.date === date) : all;
    } catch (err) {
      console.error("Walk-in lookup failed:", err);
    }

    // Stats
    const active = bookings.filter((b) => b.status !== "cancelled");
    const totalRevenue = active.reduce((sum, b) => sum + b.amount, 0);
    const collected = active.reduce((sum, b) => sum + b.amountPaid, 0);
    const walkinRevenue = walkins.reduce((sum, w) => sum + w.revenue, 0);
    const paid = active.filter((b) => b.paymentStatus === "paid");
    const payAtCenter = active.filter((b) => b.paymentStatus === "pay_at_center");
    const totalPlayers = active.reduce((sum, b) => sum + b.partySize, 0)
      + walkins.reduce((sum, w) => sum + w.players, 0);

    const ids = new Set(bookings.map((b) => b.bookingId));
    const details = Object.fromEntries(
      [...(await listDetails().catch(() => new Map<string, BookingDetails>()))].filter(([id]) => ids.has(id))
    );

    return NextResponse.json({
      bookings,
      details,
      walkins,
      stats: {
        total: bookings.length,
        active: active.length,
        cancelled: bookings.length - active.length,
        paid: paid.length,
        payAtCenter: payAtCenter.length,
        totalRevenue,
        collected,
        walkins: walkins.length,
        walkinRevenue,
        totalPlayers,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch bookings", details: message },
      { status: 500 }
    );
  }
}

// POST — admin actions on a booking. Actions:
//   { pin, action: "create", ...createSchema }   walk-in / phone / birthday
//   { pin, action: "mark_balance_paid", bookingId, method }
//   { pin, action: "set_status", bookingId, status }   check-in / no-show
//   { pin, action: "apply_discount",   bookingId, discountType, discountValue, reason? }
//   { pin, action: "clear_discount",   bookingId }
//
// Auth model:
//   - Staff PIN allows mark_balance_paid, clear_discount, and
//     apply_discount up to 20% (percent) OR equivalent flat rupees.
//   - Owner PIN is required for anything > 20% — protects against a rep
//     accidentally (or knowingly) giving away half the ticket.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const role = roleForPin(body.pin);
    const isOwner = role === "owner";
    if (!role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { action, bookingId } = body;
    if (action === "create") return createCounterBooking(body, role);
    if (action === "save_event") return saveEvent(body, role);
    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const hit = await findBookingById(bookingId);
    if (!hit) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (action === "mark_balance_paid") {
      const method = collectedVia.safeParse(body.method);
      if (!method.success) {
        return NextResponse.json({ error: "method must be cash, upi, card or bank" }, { status: 400 });
      }
      if (hit.booking.status === "cancelled") {
        return NextResponse.json(
          { error: "Cannot collect balance on a cancelled booking" },
          { status: 400 }
        );
      }
      await updateBookingCells(hit.rowIndex, {
        paymentStatus: "paid",
        amountPaid: String(hit.booking.amount),
        balanceDue: "0",
      });
      // ref: card approval code (or UPI ref) typed by staff, for reconciliation.
      const ref = typeof body.ref === "string" ? body.ref.trim().slice(0, 40) : "";
      await recordPayment({ bookingId, amount: hit.booking.balanceDue, method: method.data, ref, by: role });
      return NextResponse.json({ success: true });
    }

    if (action === "set_status") {
      const status = z.enum(["confirmed", "checked_in", "no_show", "completed"]).safeParse(body.status);
      if (!status.success || hit.booking.status === "cancelled") {
        return NextResponse.json({ error: "Invalid status change" }, { status: 400 });
      }
      if (status.data === "completed") {
        if (hit.booking.balanceDue > 0) {
          return NextResponse.json({ error: "Collect the balance before completing" }, { status: 400 });
        }
        const d = await getDetails(bookingId);
        await saveDetails(bookingId, {
          invoiceNo: d.invoiceNo || (await nextInvoiceNo()),
          completedAt: new Date().toISOString(),
        });
      }
      await updateBookingCells(hit.rowIndex, { status: status.data });
      return NextResponse.json({ success: true });
    }

    // Games actually played, ticked at check-in or on completion. Drives
    // the platform fees in the owner analytics.
    if (action === "set_games") {
      const games = z.record(z.string(), z.number().int().min(1).max(60)).safeParse(body.games);
      if (!games.success) return NextResponse.json({ error: "Invalid games" }, { status: 400 });
      await saveDetails(bookingId, { games: games.data });
      return NextResponse.json({ success: true });
    }

    // Bill link + thank-you message for a completed booking. "bill" returns
    // them for WhatsApp (staff tap Send); "email_bill" sends by email.
    if (action === "bill" || action === "email_bill") {
      if (hit.booking.status !== "completed") {
        return NextResponse.json({ error: "Complete the booking first" }, { status: 400 });
      }
      const url = billUrl(new URL(request.url).origin, bookingId);
      if (!url) return NextResponse.json({ error: "Bills aren't set up (BILL_SECRET missing)" }, { status: 503 });
      const message = billMessage(hit.booking, url, await getOps());
      if (action === "email_bill") {
        if (!hit.booking.email) return NextResponse.json({ error: "No email on this booking" }, { status: 400 });
        const { error } = await sendBillEmail(hit.booking, message);
        if (error) return NextResponse.json({ error: "Email failed" }, { status: 502 });
        return NextResponse.json({ success: true });
      }
      // wa.me wants digits only, with the country code (10-digit numbers are Indian).
      const digits = hit.booking.phone.replace(/\D/g, "");
      const whatsapp = `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}?text=${encodeURIComponent(message)}`;
      return NextResponse.json({ success: true, url, message, whatsapp });
    }

    // Razorpay payment link for the balance (or a part of it, e.g. an event
    // advance). Razorpay texts / emails it; the webhook records the payment.
    if (action === "payment_link") {
      const balance = inclGst(hit.booking, hit.booking.balanceDue);
      const amount = Math.min(balance, Math.round(Number(body.amountInclGst) || balance));
      if (amount <= 0 || hit.booking.status === "cancelled") {
        return NextResponse.json({ error: "Nothing to collect" }, { status: 400 });
      }
      const url = await createPaymentLink({
        bookingId,
        amountINR: amount,
        name: hit.booking.name,
        phone: hit.booking.phone,
        email: hit.booking.email,
        description: `Tesseract Arena · ${bookingId}`,
      });
      return NextResponse.json({ success: true, url, amount });
    }

    if (action === "apply_discount") {
      if (hit.booking.status === "cancelled") {
        return NextResponse.json(
          { error: "Cannot discount a cancelled booking" },
          { status: 400 }
        );
      }
      const discountType = body.discountType;
      const discountValue = Number(body.discountValue);
      const reason = (body.reason || "").toString().slice(0, 200);
      if (
        (discountType !== "percent" && discountType !== "flat") ||
        !Number.isFinite(discountValue) ||
        discountValue <= 0
      ) {
        return NextResponse.json(
          { error: "discountType (percent|flat) and positive discountValue required" },
          { status: 400 }
        );
      }
      // Rupees off the CURRENT ex-GST amount. Percent discounts round to
      // the nearest rupee so the balance is a clean number at the counter.
      const currentAmount = hit.booking.amount;
      const repDiscount =
        discountType === "percent"
          ? Math.round((currentAmount * discountValue) / 100)
          : Math.round(discountValue);
      if (repDiscount >= currentAmount) {
        return NextResponse.json(
          { error: "Discount can't exceed the outstanding amount" },
          { status: 400 }
        );
      }
      // Owner-pin gate: anything >20% (or a flat ₹ that lands >20%) needs
      // the owner. Staff can't nudge this by picking flat instead of %.
      const effectivePct = (repDiscount / currentAmount) * 100;
      if (effectivePct > 20 && !isOwner) {
        return NextResponse.json(
          {
            error: "Owner PIN required for discounts over 20%",
            requiresOwnerPin: true,
          },
          { status: 403 }
        );
      }

      const newAmount = currentAmount - repDiscount;
      // GST recomputes on the new post-discount amount so the customer's
      // final bill (amount × 1.18) reflects the discount too.
      const newGstAmount = gstOn(newAmount);
      const newDiscountAmount = hit.booking.discountAmount + repDiscount;
      const newBalanceDue = Math.max(0, newAmount - hit.booking.amountPaid);
      // Audit line appended to specialRequests so the discount trail is
      // visible next to the booking without a schema change. Reason (if
      // given) and effective % are logged.
      const nowIST = new Date()
        .toLocaleString("en-CA", { timeZone: "Asia/Kolkata" })
        .replace(",", "");
      const note = `[${nowIST} · ${isOwner ? "owner" : "staff"} discount ${effectivePct.toFixed(1)}% / ₹${repDiscount}${reason ? " · " + reason : ""}]`;
      const nextSpecial = (hit.booking.specialRequests || "")
        + (hit.booking.specialRequests ? " " : "")
        + note;

      await updateBookingCells(hit.rowIndex, {
        amount: String(newAmount),
        gstAmount: String(newGstAmount),
        discountAmount: String(newDiscountAmount),
        balanceDue: String(newBalanceDue),
        specialRequests: nextSpecial,
      });
      return NextResponse.json({
        success: true,
        discountApplied: repDiscount,
        newAmount,
        newBalanceDue,
      });
    }

    if (action === "clear_discount") {
      // Undo the rep-applied discount by restoring the ORIGINAL pre-any-
      // discount amount = current amount + discountAmount. Rewrites the
      // downstream GST + balance. Site-wide promo discounts stored at
      // booking creation are lost this way — which is the intended
      // "clear everything" behavior. Caller can re-add if needed.
      const originalAmount = hit.booking.amount + hit.booking.discountAmount;
      const originalGst = gstOn(originalAmount);
      const newBalance = Math.max(0, originalAmount - hit.booking.amountPaid);
      const nowIST = new Date()
        .toLocaleString("en-CA", { timeZone: "Asia/Kolkata" })
        .replace(",", "");
      const note = `[${nowIST} · ${isOwner ? "owner" : "staff"} cleared discount]`;
      const nextSpecial = (hit.booking.specialRequests || "")
        + (hit.booking.specialRequests ? " " : "")
        + note;
      await updateBookingCells(hit.rowIndex, {
        amount: String(originalAmount),
        gstAmount: String(originalGst),
        discountAmount: "0",
        balanceDue: String(newBalance),
        specialRequests: nextSpecial,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Action failed", details: message },
      { status: 500 }
    );
  }
}

// Counter / phone / birthday bookings made by staff. Amounts arrive as the
// customer sees them (incl. GST) and are stored ex-GST like every other row.
// The slot block is checked like an online booking, so a walk-in can no
// longer silently overlap a slot the website just sold.
const createSchema = z.object({
  source: z.enum(["walkin", "phone", "birthday"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
  slots: z.number().int().min(1).max(8),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(10).max(20),
  email: z.union([z.literal(""), z.email()]).default(""),
  partySize: z.number().int().min(1).max(40),
  gamePreference: z.string().min(1),
  totalInclGst: z.number().int().min(0),
  receivedInclGst: z.number().int().min(0),
  method: collectedVia,
  notes: z.string().max(500).default(""),
});

const exGst = (incl: number) => Math.round((incl * 100) / (100 + GST_PERCENT));

async function createCounterBooking(body: unknown, role: AdminRole) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  if (d.receivedInclGst > d.totalInclGst) {
    return NextResponse.json({ error: "Received can't be more than the total" }, { status: 400 });
  }

  const slotError = await checkSlots(d.date, d.timeSlot, d.slots);
  if (slotError) return slotError;

  // Staff can price below list (counter deals) but, like rep discounts,
  // more than 20% off needs the owner PIN.
  const pricing = await getPricing();
  const isBirthday = d.source === "birthday";
  const perHead = isBirthday
    ? pricing.birthdayPerKid
    : d.gamePreference === DECIDE_AT_VENUE_ID
    ? maxGamePrice(pricing)
    : gamePrice(pricing, d.gamePreference);
  const listPrice = perHead * d.partySize;
  const amount = exGst(d.totalInclGst);
  if (role !== "owner" && amount < listPrice * 0.8) {
    return NextResponse.json(
      { error: "Owner PIN required for more than 20% below list price", requiresOwnerPin: true },
      { status: 403 }
    );
  }

  const received = Math.min(amount, exGst(d.receivedInclGst));
  const booking: BookingRow = {
    bookingId: `TA-${nanoid(6).toUpperCase()}`,
    arenaId: "arena-1",
    name: d.name,
    email: d.email,
    phone: d.phone,
    date: d.date,
    timeSlot: d.timeSlot,
    partySize: d.partySize,
    package: isBirthday ? "birthday-standard" : STANDARD_PACKAGE,
    gamePreference: d.gamePreference,
    paymentStatus: received > 0 ? "paid" : "pay_at_center",
    paymentMethod: "pay_at_center",
    razorpayOrderId: "",
    razorpayPaymentId: "",
    amount,
    specialRequests: d.notes,
    createdAt: formatInTimeZone(new Date(), "Asia/Kolkata", "yyyy-MM-dd'T'HH:mm:ssxxx"),
    status: d.source === "walkin" ? "checked_in" : "confirmed",
    amountPaid: received,
    balanceDue: amount - received,
    gstAmount: gstOn(amount),
    discountAmount: Math.max(0, listPrice - amount),
    source: d.source,
    slots: d.slots,
  };
  await appendBooking(booking);
  await recordPayment({ bookingId: booking.bookingId, amount: received, method: d.method, by: role });
  return NextResponse.json({ success: true, booking });
}

// Null when the run of slots is free, else the error response.
async function checkSlots(date: string, timeSlot: string, slots: number) {
  const daySlots = getSlotsForDate(date);
  const start = daySlots.indexOf(timeSlot);
  const needed = daySlots.slice(start, start + slots);
  if (start === -1 || needed.length < slots) {
    return NextResponse.json({ error: `Not enough slots left in the day from ${formatTimeDisplay(timeSlot)}` }, { status: 400 });
  }
  const booked = await getBookedSlotsForDate(date);
  const clash = needed.find((t) => booked.includes(t));
  return clash ? NextResponse.json({ error: `${formatTimeDisplay(clash)} is already booked` }, { status: 409 }) : null;
}

// Birthday / corporate events: create, or edit people, food and price on an
// existing one (date and time stay fixed; cancel and rebook to move it).
// The server prices everything from the menu so the bill can't drift.
const eventSchema = z.object({
  bookingId: z.string().optional(),
  kind: z.enum(["birthday", "corporate"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
  slots: z.number().int().min(1).max(11),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(10).max(20),
  email: z.union([z.literal(""), z.email()]).default(""),
  partySize: z.number().int().min(1).max(60),
  perHead: z.number().int().min(0),
  company: z.string().trim().max(120).default(""),
  gstin: z.string().trim().max(15).default(""),
  eaters: z.number().int().min(0).max(200).default(0),
  food: z.array(z.enum(FOOD_MENU.map((f) => f.id) as ["combo", "pasta"])).default([]),
  custom: z
    .array(z.object({
      name: z.string().trim().min(1).max(60),
      qty: z.number().int().min(1).max(500),
      price: z.number().int().min(0),
      gst: z.union([z.literal(5), z.literal(18)]),
    }))
    .max(20)
    .default([]),
  cake: z.enum(["byo", "custom"]).default("byo"),
  notes: z.string().max(500).default(""),
  receivedInclGst: z.number().int().min(0).default(0),
  method: collectedVia.default("upi"),
});

async function saveEvent(body: unknown, role: AdminRole) {
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const [pricing, ops] = await Promise.all([getPricing(), getOps()]);
  const listPerHead = d.kind === "corporate" ? ops.corporatePerHead : pricing.birthdayPerKid;
  if (role !== "owner" && d.perHead < listPerHead * 0.8) {
    return NextResponse.json(
      { error: "Owner PIN required for more than 20% below list price", requiresOwnerPin: true },
      { status: 403 }
    );
  }
  const details: BookingDetails = {
    kind: d.kind, perHead: d.perHead, company: d.company, gstin: d.gstin,
    eaters: d.eaters, food: d.food, custom: d.custom, cake: d.cake,
  };
  const bill = eventBill(d.partySize, details, ops, pricing);
  const discountAmount = String(Math.max(0, (listPerHead - d.perHead) * d.partySize));

  if (d.bookingId) {
    const hit = await findBookingById(d.bookingId);
    if (!hit || hit.booking.status === "cancelled") {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    await updateBookingCells(hit.rowIndex, {
      partySize: String(d.partySize),
      amount: String(bill.amount),
      gstAmount: String(bill.gst),
      balanceDue: String(Math.max(0, bill.amount - hit.booking.amountPaid)),
      discountAmount,
      specialRequests: d.notes,
    });
    await saveDetails(d.bookingId, details);
    return NextResponse.json({ success: true, bookingId: d.bookingId });
  }

  const slotError = await checkSlots(d.date, d.timeSlot, d.slots);
  if (slotError) return slotError;
  const received = Math.min(bill.amount, Math.round((d.receivedInclGst * bill.amount) / (bill.amount + bill.gst || 1)));
  const booking: BookingRow = {
    bookingId: `TA-${nanoid(6).toUpperCase()}`,
    arenaId: "arena-1",
    name: d.name,
    email: d.email,
    phone: d.phone,
    date: d.date,
    timeSlot: d.timeSlot,
    partySize: d.partySize,
    package: d.kind === "birthday" ? "birthday-standard" : STANDARD_PACKAGE,
    gamePreference: DECIDE_AT_VENUE_ID,
    paymentStatus: received > 0 ? "paid" : "pay_at_center",
    paymentMethod: "pay_at_center",
    razorpayOrderId: "",
    razorpayPaymentId: "",
    amount: bill.amount,
    specialRequests: d.notes,
    createdAt: formatInTimeZone(new Date(), "Asia/Kolkata", "yyyy-MM-dd'T'HH:mm:ssxxx"),
    status: "confirmed",
    amountPaid: received,
    balanceDue: bill.amount - received,
    gstAmount: bill.gst,
    discountAmount: Number(discountAmount),
    source: d.kind,
    slots: d.slots,
  };
  await appendBooking(booking);
  await saveDetails(booking.bookingId, details);
  await recordPayment({ bookingId: booking.bookingId, amount: received, method: d.method, by: role });
  return NextResponse.json({ success: true, bookingId: booking.bookingId });
}

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
import { listDiscounts } from "@/lib/discount-sheets";
import { pickActiveDiscount, applyDiscount } from "@/lib/discount-config";
import { sendBookingEmailsFromRow } from "@/lib/email";
import {
  calculatePrice,
  calculateSessionPrice,
  isDateBookable,
  getSlotsForDate,
  formatTimeDisplay,
  gstOn,
} from "@/lib/booking-config";
import type { BookingRow, PerPersonPackageType } from "@/lib/booking-types";
import { allGames, availableGames, getGamePlayerRange } from "@/data/games";
import { AUTOTEST_MARKER, isAutotestRequest } from "@/lib/autotest";
import { getAdvanceRequired } from "@/lib/settings-sheets";
import { getClientIp, verifyTurnstileToken } from "@/lib/turnstile";

// Sentinel game id used by the /book wizard when the customer opts to
// pick their title at the counter instead of committing up front. When
// this comes in we skip the game-cap validation and use the highest
// Available game price as the ceiling — actual price is settled at the
// arena based on which title they play.
const DECIDE_AT_VENUE_ID = "decide-at-venue";

const bookingSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(10).max(15),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
    partySize: z.number().int().min(1).max(8),
    package: z.enum(["solo", "squad", "party"]),
    gamePreference: z.string().min(1),
    paymentMethod: z.enum(["razorpay", "pay_at_center"]),
    specialRequests: z.string().max(500).optional(),
    arenaId: z.string().optional().default("arena-1"),
    // Client-set signal that this booking came via the kiosk flow
    // (/book?kiosk=1 on the counter QR). Used only to EXEMPT the
    // booking from the no-advance-rewrite — a kiosk customer who picks
    // "Pay Online" on their phone genuinely wants to pay the full
    // amount via Razorpay right there and shouldn't be silently flipped
    // to pay-at-center. Not trusted for security-sensitive decisions
    // (Turnstile + per-contact quota still apply) because the client
    // is unauthenticated.
    isKiosk: z.boolean().optional().default(false),
    // Optional coupon code the customer entered in the booking flow. When
    // set, pickActiveDiscount considers coupon-gated campaigns matching
    // this code — otherwise only auto-apply campaigns are considered.
    couponCode: z
      .string()
      .max(24)
      .regex(/^[A-Za-z0-9_-]*$/)
      .optional(),
    // Cloudflare Turnstile token. Optional at the schema level because
    // autotest requests + local dev (no secret configured) don't send
    // one; the server-side verify handles both those cases cleanly.
    turnstileToken: z.string().max(2048).optional(),
  })
  .refine(
    (data) => {
      if (data.package === "solo") return data.partySize === 1;
      if (data.package === "squad")
        return data.partySize >= 2 && data.partySize <= 5;
      if (data.package === "party")
        return data.partySize >= 6 && data.partySize <= 8;
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

    // Autotest mode: when the nightly smoke suite sets a valid
    // x-autotest-token header the booking goes through the same
    // validation + sheet-write path a real one does, but:
    //   • paymentStatus is forced to "paid" (no Razorpay round-trip)
    //   • specialRequests gets tagged with [AUTOTEST] so the cleanup
    //     endpoint can find and delete it later
    //   • the active-bookings quota check is skipped (every run uses a
    //     unique autotest+<runId>@tesseractarena.com so it would never
    //     trip, but belt-and-braces)
    //   • no confirmation email fires — we don't want to spam ourselves
    const isAutotest = isAutotestRequest(request);

    // Cloudflare Turnstile bot-check — runs BEFORE any sheet reads so
    // a flood of fake bookings doesn't eat our Google Sheets quota.
    //
    // Skipped for:
    //   • autotest requests (AUTOTEST_TOKEN header is its own, stronger
    //     authentication)
    //   • kiosk bookings (counter walk-ins all share the arena WiFi IP;
    //     Cloudflare would start challenging the counter tablet after
    //     a few bookings in a row, breaking the walk-in flow. The
    //     per-contact quota + physical staff presence are the
    //     mitigations here instead.)
    //
    // Local dev without TURNSTILE_SECRET configured also skips via the
    // helper's dev-mode fallback, so booking works against localhost
    // without a Cloudflare account.
    if (!isAutotest && !data.isKiosk) {
      const verdict = await verifyTurnstileToken(
        data.turnstileToken,
        getClientIp(request)
      );
      if (!verdict.ok) {
        console.warn(
          "Turnstile verification failed:",
          verdict.errorCodes?.join(",") || "unknown"
        );
        return NextResponse.json(
          {
            error:
              "We couldn't verify this request. Please refresh the page and try again.",
          },
          { status: 403 }
        );
      }
    }

    // Admin toggle (Settings sheet) — when advance_required=false, any
    // ONLINE booking that asked for razorpay gets quietly rewritten
    // to pay_at_center server-side. This prevents a stale client (or
    // a tampered request) from short-circuiting the experiment and
    // still collecting an advance when staff explicitly turned it off.
    //
    // Kiosk bookings are EXEMPT from the rewrite. The experiment is
    // about "don't charge an advance to a customer booking from home" —
    // but a walk-in customer at the counter who taps "Pay Online"
    // actively wants to pay the full amount via Razorpay right there,
    // and silently flipping them to pay-at-center would break that
    // button's UX. Autotest flows also bypass via a different path.
    const advanceRequired = isAutotest ? true : await getAdvanceRequired();
    const effectivePaymentMethod =
      !advanceRequired && !data.isKiosk && data.paymentMethod === "razorpay"
        ? ("pay_at_center" as const)
        : data.paymentMethod;

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

    // Verify partySize fits the chosen game's supported range. Anvio 30-min
    // titles cap at 6; Revolta (PvP) allows 8; Versus starts at 2. Custom
    // admin-created games have no `players` field on our known list so this
    // check is skipped for them (they use the legacy fallback). "Decide at
    // venue" also skips the check — no specific game to constrain to yet.
    const isDecideAtVenue = data.gamePreference === DECIDE_AT_VENUE_ID;
    const gameForCheck = isDecideAtVenue
      ? null
      : allGames.find((g) => g.id === data.gamePreference);
    if (gameForCheck) {
      const [gMin, gMax] = getGamePlayerRange(gameForCheck.players);
      if (data.partySize < gMin || data.partySize > gMax) {
        return NextResponse.json(
          {
            error: `${gameForCheck.title} supports ${gameForCheck.players} players. Please adjust your party size or pick a different game.`,
          },
          { status: 400 }
        );
      }
    }

    // Check booking limit (max 2 active bookings per person).
    // Autotest runs use a unique email per execution so this check
    // would never catch anything useful, and skipping it saves one
    // Sheet round-trip on each smoke run.
    if (!isAutotest) {
      const activeBookings = await getActiveBookingsByContact(data.email, data.phone);
      const activePayAtCenter = activeBookings.filter(b => b.paymentMethod === "pay_at_center");
      // Only enforce the pay-at-center quota when it's actually
      // optional. When the admin has turned advance OFF everyone's
      // technically pay-at-center, so the quota would block
      // legitimate second bookings.
      if (
        advanceRequired &&
        activePayAtCenter.length >= 2 &&
        effectivePaymentMethod === "pay_at_center"
      ) {
        return NextResponse.json(
          { error: "You already have 2 active bookings with Pay at Center. Please pay online or cancel an existing booking first." },
          { status: 429 }
        );
      }
      // When advance is required: 4 active bookings per contact is
      // lenient but defensible because each one has a ₹500/head
      // commitment behind it.
      //
      // When advance is OFF: no money is on the line, so 4 bookings
      // under one phone/email is a spam ladder. Tighten to 1 active
      // booking per contact. A customer who's shown up and finished
      // one session can book the next one; a spammer with one fake
      // phone can only block one slot at a time.
      //
      // getActiveBookingsByContact matches on email OR phone, so both
      // identifiers are protected by the same check.
      const quota = advanceRequired ? 4 : 1;
      if (activeBookings.length >= quota) {
        return NextResponse.json(
          {
            error: advanceRequired
              ? "Maximum 4 active bookings allowed per person. Please cancel an existing booking first."
              : "You already have an active booking under this phone or email. Please cancel it before booking another slot, or contact us if you need multiple sessions.",
          },
          { status: 429 }
        );
      }
    }

    // Check for double-booking. Party bookings (>=6 players) run ~90 min and
    // need both the chosen slot and the next one free.
    const bookedSlots = await getBookedSlotsForDate(data.date, data.arenaId);
    if (bookedSlots.includes(data.timeSlot)) {
      return NextResponse.json(
        { error: "This slot is already booked. Please select another time." },
        { status: 409 }
      );
    }
    if (data.partySize >= 6) {
      const daySlots = getSlotsForDate(data.date);
      const idx = daySlots.indexOf(data.timeSlot);
      const nextSlot = idx >= 0 ? daySlots[idx + 1] : undefined;
      if (!nextSlot) {
        return NextResponse.json(
          { error: "Party bookings run 90 minutes — please pick an earlier slot so the follow-on slot fits within the day." },
          { status: 409 }
        );
      }
      if (bookedSlots.includes(nextSlot)) {
        return NextResponse.json(
          { error: "Party bookings need two back-to-back slots free. The slot after your selection is taken — please pick another time." },
          { status: 409 }
        );
      }
    }

    // Generate booking ID.
    // Base price is derived server-side from the chosen game + tier + party
    // size so the client cannot understate it. Falls back to the legacy
    // package price if the gamePreference doesn't match a known game (e.g.
    // custom admin-created games without a pricePerPerson value).
    const bookingId = `TA-${nanoid(6).toUpperCase()}`;
    const game = allGames.find((g) => g.id === data.gamePreference);
    const perPersonPkg = data.package as PerPersonPackageType;
    // "Decide at venue" uses the highest Available ex-GST price as the
    // stored ceiling — the customer pays their ₹500/head advance now and
    // the balance is trued up at the counter when they pick a title.
    const priceBasis = isDecideAtVenue
      ? Math.max(...availableGames.map((g) => g.pricePerPerson))
      : game?.pricePerPerson;
    const basePrice = priceBasis
      ? calculateSessionPrice(priceBasis, perPersonPkg, data.partySize)
      : calculatePrice(data.package, data.partySize);
    let amount = basePrice;
    try {
      const discounts = await listDiscounts();
      const active = pickActiveDiscount(
        discounts,
        data.date,
        data.package,
        basePrice,
        data.couponCode
      );
      if (active) amount = applyDiscount(basePrice, active);
    } catch (err) {
      // Discount lookup failure should not block a booking — fall back to base.
      console.error("Discount lookup failed:", err);
    }
    // Rupees the customer saved vs the un-discounted base price. Zero when
    // no discount applied. Logged separately in the sheet for promo tracking.
    const discountAmount = Math.max(0, basePrice - amount);
    // GST is a fixed 18% of the (post-discount) ex-GST amount. Collected
    // from the customer and remitted to govt — never part of our revenue.
    const gstAmount = gstOn(amount);
    const nowIST = toZonedTime(new Date(), "Asia/Kolkata");
    const createdAt = format(nowIST, "yyyy-MM-dd'T'HH:mm:ssxxx");

    // Normal flow: pending (razorpay) or pay_at_center.
    // Autotest flow: paid outright, no Razorpay step. Both the amount
    // and the (fake) payment id get synthesised so the row looks
    // internally consistent to any downstream reporting query.
    const paymentStatus = isAutotest
      ? "paid"
      : effectivePaymentMethod === "pay_at_center"
      ? "pay_at_center"
      : "pending";

    // specialRequests carries the AUTOTEST marker so the cleanup
    // endpoint can scan Sheet1 for test rows without needing a
    // schema change. Any customer specialRequests are preserved
    // after a separator.
    const tagged = isAutotest
      ? `${AUTOTEST_MARKER}${data.specialRequests ? ` ${data.specialRequests}` : ""}`
      : (data.specialRequests || "");

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
      paymentMethod: effectivePaymentMethod,
      razorpayOrderId: isAutotest ? "autotest-order" : "",
      razorpayPaymentId: isAutotest ? "autotest-payment" : "",
      amount,
      specialRequests: tagged,
      createdAt,
      status: "confirmed",
      // Autotest bookings are "paid" immediately so amountPaid mirrors
      // the full amount and nothing is due. Regular flow leaves these
      // zero until verify/webhook flips them.
      amountPaid: isAutotest ? amount : 0,
      balanceDue: isAutotest ? 0 : amount,
      gstAmount,
      discountAmount,
    };

    // Save to Google Sheets
    await appendBooking(booking);

    // Confirmation emails:
    //   - autotest: NEVER send. The whole point is a silent smoke test
    //     — spamming the arena ops inbox every night defeats it.
    //   - pay_at_center: send immediately. The booking IS final at
    //     create-time; no payment step follows that could invalidate it.
    //   - razorpay: SKIP here. Emails fire from /api/payments/verify
    //     (client success path) or /api/payments/webhook (Razorpay's
    //     server-side callback) once the payment is actually captured.
    //     Both guard on paymentStatus !== "paid" so we avoid double-
    //     sending in the common case where both signals arrive.
    let emailError: string | null = null;
    if (!isAutotest && effectivePaymentMethod === "pay_at_center") {
      emailError = await sendBookingEmailsFromRow(booking);
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
        paymentMethod: effectivePaymentMethod,
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

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import type { BookingRow } from "@/lib/booking-types";
import { findBookingById, updateBookingCells } from "@/lib/google-sheets";

function getAuth() {
  const privateKey = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "",
    "base64"
  ).toString("utf-8");

  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function GET(request: NextRequest) {
  try {
    // Simple password protection
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get("pin");
    const adminPin = process.env.ADMIN_PIN || "1234";

    if (pin !== adminPin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const date = searchParams.get("date");

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A2:V",
    });

    const rows = (res.data.values || []) as string[][];

    let bookings = rows.map((row): BookingRow => {
      const partySize = parseInt(row[7] || "1");
      const amount = parseInt(row[14] || "0");
      const paymentStatus = (row[10] || "pending") as BookingRow["paymentStatus"];
      // Legacy rows (created before columns S/T existed) fall back to a
      // computed advance derived from paymentStatus + party size + total.
      const rawPaid = row[18];
      const amountPaid =
        rawPaid !== undefined && rawPaid !== ""
          ? parseInt(rawPaid)
          : paymentStatus === "paid"
          ? Math.min(500 * partySize, amount)
          : 0;
      const rawBalance = row[19];
      const balanceDue =
        rawBalance !== undefined && rawBalance !== ""
          ? parseInt(rawBalance)
          : Math.max(0, amount - amountPaid);
      // gstAmount + discountAmount are new columns (U/V). Legacy rows fall
      // back to 0 — they pre-date GST collection and launch pricing.
      const rawGST = row[20];
      const gstAmount =
        rawGST !== undefined && rawGST !== "" ? parseInt(rawGST) : 0;
      const rawDiscount = row[21];
      const discountAmount =
        rawDiscount !== undefined && rawDiscount !== ""
          ? parseInt(rawDiscount)
          : 0;
      return {
        bookingId: row[0] || "",
        arenaId: row[1] || "arena-1",
        name: row[2] || "",
        email: row[3] || "",
        phone: row[4] || "",
        date: row[5] || "",
        timeSlot: row[6] || "",
        partySize,
        package: (row[8] || "solo") as BookingRow["package"],
        gamePreference: row[9] || "",
        paymentStatus,
        paymentMethod: (row[11] || "pay_at_center") as BookingRow["paymentMethod"],
        razorpayOrderId: row[12] || "",
        razorpayPaymentId: row[13] || "",
        amount,
        specialRequests: row[15] || "",
        createdAt: row[16] || "",
        status: (row[17] || "confirmed") as BookingRow["status"],
        amountPaid,
        balanceDue,
        gstAmount,
        discountAmount,
      };
    });

    // Filter by date if provided
    if (date) {
      bookings = bookings.filter((b) => b.date === date);
    }

    // Sort by date and time
    bookings.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.timeSlot.localeCompare(b.timeSlot);
    });

    // Stats
    const active = bookings.filter((b) => b.status !== "cancelled");
    const totalRevenue = active.reduce((sum, b) => sum + b.amount, 0);
    const paid = active.filter((b) => b.paymentStatus === "paid");
    const payAtCenter = active.filter((b) => b.paymentStatus === "pay_at_center");

    return NextResponse.json({
      bookings,
      stats: {
        total: bookings.length,
        active: active.length,
        cancelled: bookings.length - active.length,
        paid: paid.length,
        payAtCenter: payAtCenter.length,
        totalRevenue,
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
//   { pin, action: "mark_balance_paid", bookingId }
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
    const staffPin = process.env.ADMIN_PIN || "1234";
    const ownerPin = process.env.OWNER_PIN;
    const isStaff = body.pin === staffPin;
    const isOwner = !!ownerPin && body.pin === ownerPin;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { action, bookingId } = body;
    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const hit = await findBookingById(bookingId);
    if (!hit) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (action === "mark_balance_paid") {
      if (hit.booking.status === "cancelled") {
        return NextResponse.json(
          { error: "Cannot collect balance on a cancelled booking" },
          { status: 400 }
        );
      }
      await updateBookingCells(hit.rowIndex, {
        amountPaid: String(hit.booking.amount),
        balanceDue: "0",
      });
      return NextResponse.json({ success: true });
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
      const newGstAmount = Math.round((newAmount * 18) / 100);
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
      const originalGst = Math.round((originalAmount * 18) / 100);
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

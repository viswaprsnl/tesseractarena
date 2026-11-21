import type { BookingRow, BookingSource } from "./booking-types";
import { getSheets, SPREADSHEET_ID } from "./sheets";
import { isBirthdayPackage } from "./booking-types";
import { getSlotsForDate, getTodayISTString } from "./booking-config";
import { BIRTHDAY_PACKAGES } from "@/data/birthday";

// How many consecutive slots this booking physically occupies.
// - Birthday: the current "standard" package blocks baseSlotsBlocked
//   (2). Legacy tier rows (essentials/plus/ultimate) predate it and
//   blocked up to 3+, so they keep a conservative 3.
// - Party (partySize >= 6): 2 slots (existing 90-min behavior)
// - Everything else: 1 slot
export function slotsOccupiedBy(booking: BookingRow): number {
  if (booking.slots > 0) return booking.slots;
  if (isBirthdayPackage(booking.package)) {
    const key = booking.package.replace("birthday-", "");
    const pkg = BIRTHDAY_PACKAGES.find((p) => p.id === key);
    // Legacy tier lookups won't match the new single "standard" id;
    // fall back to the safe upper bound so slot availability is
    // conservative (false negatives are better than double-bookings).
    if (pkg) return pkg.baseSlotsBlocked;
    return 3;
  }
  if (booking.partySize >= 6) return 2;
  return 1;
}

const SHEET_NAME = "Sheet1";

export async function getBookingsForDate(
  date: string,
  arenaId: string = "arena-1"
): Promise<BookingRow[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:X`,
  });

  const rows = res.data.values || [];
  return rows
    .filter(
      (row) =>
        row[5] === date &&
        row[1] === arenaId &&
        row[17] !== "cancelled"
    )
    .map(rowToBooking);
}

// Party bookings (partySize >= 6) run ~90 min and physically block the next
// slot too. Birthday packages block 2 or 3 consecutive slots depending on
// tier. Both the slot picker and the double-booking check treat every
// occupied slot as taken.
export async function getBookedSlotsForDate(
  date: string,
  arenaId: string = "arena-1"
): Promise<string[]> {
  const bookings = await getBookingsForDate(date, arenaId);
  const slotsInDay = getSlotsForDate(date);
  const blocked = new Set<string>();
  for (const b of bookings) {
    blocked.add(b.timeSlot);
    const occupies = slotsOccupiedBy(b);
    if (occupies > 1) {
      const idx = slotsInDay.indexOf(b.timeSlot);
      if (idx >= 0) {
        for (let i = 1; i < occupies && idx + i < slotsInDay.length; i++) {
          blocked.add(slotsInDay[idx + i]);
        }
      }
    }
  }
  return [...blocked];
}

export async function getActiveBookingsByContact(
  email: string,
  phone: string
): Promise<BookingRow[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:X`,
  });

  const rows = res.data.values || [];
  const today = getTodayISTString();

  return rows
    .filter(
      (row) =>
        (row[3] === email || row[4] === phone) &&
        row[17] !== "cancelled" &&
        row[5] >= today
    )
    .map(rowToBooking);
}

export async function appendBooking(booking: BookingRow): Promise<string> {
  const sheets = getSheets();
  const values = bookingToRow(booking);
  // Append against column A ONLY. The Sheets append call detects a
  // "table" inside `range` and writes starting at that table's first
  // column. With range `A:V` that detection drifted: rows landed in
  // Q:AL (16 columns to the right), so the admin reader (A2:V) never
  // saw them. Pointing detection at column A alone pins the first
  // column to A and the new row to the first free row below the last
  // booking id.
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:A`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
  let range = res.data.updates?.updatedRange || "?";

  // Self-heal: if the row still didn't start at column A, rewrite it
  // into A:V on the same row and blank the stray cells, rather than
  // silently losing a customer's booking off the admin's radar.
  const m = range.match(/!([A-Z]+)(\d+):/);
  if (m && m[1] !== "A") {
    const row = m[2];
    console.error(
      `appendBooking: MISPLACED write for ${booking.bookingId} at ${range} — relocating to A${row}:V${row}`
    );
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${row}:AL${row}`,
      valueInputOption: "RAW",
      requestBody: {
        // A..AL is 38 columns: the booking plus blanks over the stray cells.
        values: [[...values, ...Array.from({ length: 38 - values.length }, () => "")]],
      },
    });
    range = `${SHEET_NAME}!A${row}:X${row} (relocated from ${range})`;
  }

  console.log(
    `appendBooking: id=${booking.bookingId} date=${booking.date} updatedRange=${range}`
  );
  return range;
}

export async function findBookingById(
  bookingId: string
): Promise<{ booking: BookingRow; rowIndex: number } | null> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:X`,
  });

  const rows = res.data.values || [];
  const index = rows.findIndex((row) => row[0] === bookingId);
  if (index === -1) return null;

  return { booking: rowToBooking(rows[index]), rowIndex: index + 2 };
}

// Fallback lookup for the webhook when notes.bookingId is missing
// (typically only for orders created before order.notes rollout).
// Column M holds razorpayOrderId.
export async function findBookingByOrderId(
  orderId: string
): Promise<{ booking: BookingRow; rowIndex: number } | null> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:X`,
  });

  const rows = res.data.values || [];
  const index = rows.findIndex((row) => row[12] === orderId);
  if (index === -1) return null;

  return { booking: rowToBooking(rows[index]), rowIndex: index + 2 };
}

export async function updateBookingCells(
  rowIndex: number,
  updates: Record<string, string>
): Promise<void> {
  const sheets = getSheets();
  const columnMap: Record<string, string> = {
    name: "C",
    email: "D",
    phone: "E",
    partySize: "H",
    paymentStatus: "K",
    razorpayOrderId: "M",
    razorpayPaymentId: "N",
    // amount is the ex-GST session cost — needed here so rep-applied
    // discounts on the admin bookings tab can rewrite it (and gstAmount
    // right below) without having to rewrite the whole row.
    amount: "O",
    specialRequests: "P",
    status: "R",
    amountPaid: "S",
    balanceDue: "T",
    gstAmount: "U",
    discountAmount: "V",
    source: "W",
    slots: "X",
  };

  const requests = Object.entries(updates).map(([field, value]) => ({
    range: `${SHEET_NAME}!${columnMap[field]}${rowIndex}`,
    values: [[value]],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "RAW",
      data: requests,
    },
  });
}

// Tombstones a Sheet1 row by clearing every column. Mirrors the
// deleteWalkinRevenue pattern — we blank the row rather than shifting
// subsequent ones up so references into the sheet (e.g. row indices
// held briefly in flight) don't go stale. Used by the autotest
// cleanup endpoint and any future bulk delete flow.
export async function clearBookingRow(rowIndex: number): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${rowIndex}:X${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      // 24 empty strings = columns A..X.
      values: [Array.from({ length: 24 }, () => "")],
    },
  });
}

// Returns every Sheet1 row for which the predicate holds, with its
// 1-based rowIndex (as updateBookingCells expects). Used by the
// autotest cleanup to find [AUTOTEST]-tagged rows without pulling a
// full list of bookings separately.
export async function listBookingRows(
  predicate: (booking: BookingRow) => boolean
): Promise<{ booking: BookingRow; rowIndex: number }[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:X`,
  });
  const rows = res.data.values || [];
  const out: { booking: BookingRow; rowIndex: number }[] = [];
  rows.forEach((row, i) => {
    if (!row[0]) return; // skip tombstoned (blank bookingId) rows
    const booking = rowToBooking(row);
    if (predicate(booking)) out.push({ booking, rowIndex: i + 2 });
  });
  return out;
}

export async function getExpiredPayAtCenterBookings(): Promise<{ booking: BookingRow; rowIndex: number }[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:X`,
  });

  const rows = res.data.values || [];
  const now = new Date();
  const expired: { booking: BookingRow; rowIndex: number }[] = [];

  rows.forEach((row, i) => {
    if (
      row[10] === "pay_at_center" &&
      row[17] !== "cancelled" &&
      // Only online bookings expire; counter/staff-made ones are real.
      (!row[22] || row[22] === "website") &&
      row[5] && row[6] // has date and time_slot
    ) {
      // Build the session start time
      const [hours, mins] = (row[6] as string).split(":").map(Number);
      const sessionDate = new Date(row[5] + "T00:00:00+05:30");
      sessionDate.setHours(hours, mins, 0, 0);

      // Expire if session starts within 4 hours or has already passed
      const hoursUntilSession =
        (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilSession <= 4) {
        expired.push({ booking: rowToBooking(row), rowIndex: i + 2 });
      }
    }
  });

  return expired;
}

function bookingToRow(b: BookingRow): string[] {
  return [
    b.bookingId,          // A
    b.arenaId,            // B
    b.name,               // C
    b.email,              // D
    b.phone,              // E
    b.date,               // F
    b.timeSlot,           // G
    String(b.partySize),  // H
    b.package,            // I
    b.gamePreference,     // J
    b.paymentStatus,      // K
    b.paymentMethod,      // L
    b.razorpayOrderId,    // M
    b.razorpayPaymentId,  // N
    String(b.amount),     // O — ex-GST session cost
    b.specialRequests,    // P
    b.createdAt,          // Q
    b.status,             // R
    String(b.amountPaid), // S
    String(b.balanceDue), // T
    String(b.gstAmount),      // U — 18% of amount, remitted to govt
    String(b.discountAmount), // V — rupees off via discount / promo
    b.source,                 // W
    b.slots ? String(b.slots) : "", // X — blank = derived
  ];
}

// Best-guess fallback for legacy rows written before columns S/T existed.
// Uses paymentStatus + amount + partySize to reconstruct what should be
// there. `advance` here is the standard ₹500-per-person cap.
function inferAmountPaid(
  paymentStatus: string,
  amount: number,
  partySize: number
): number {
  if (paymentStatus === "paid") {
    return Math.min(500 * partySize, amount);
  }
  return 0;
}

export function rowToBooking(row: string[]): BookingRow {
  const partySize = parseInt(row[7] || "1");
  const amount = parseInt(row[14] || "0");
  const paymentStatus = (row[10] || "pending") as BookingRow["paymentStatus"];

  const rawPaid = row[18];
  const amountPaid =
    rawPaid !== undefined && rawPaid !== ""
      ? parseInt(rawPaid)
      : inferAmountPaid(paymentStatus, amount, partySize);

  const rawBalance = row[19];
  const balanceDue =
    rawBalance !== undefined && rawBalance !== ""
      ? parseInt(rawBalance)
      : Math.max(0, amount - amountPaid);

  // gstAmount + discountAmount are new columns (U/V). Legacy rows written
  // before they existed fall back to 0 — those bookings pre-date GST
  // collection and (mostly) pre-date launch pricing.
  const rawGST = row[20];
  const gstAmount =
    rawGST !== undefined && rawGST !== "" ? parseInt(rawGST) : 0;
  const rawDiscount = row[21];
  const discountAmount =
    rawDiscount !== undefined && rawDiscount !== "" ? parseInt(rawDiscount) : 0;

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
    source: (row[22] as BookingSource) || (isBirthdayPackage(row[8] || "") ? "birthday" : "website"),
    slots: parseInt(row[23] || "0") || 0,
  };
}

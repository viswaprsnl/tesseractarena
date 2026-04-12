import { google } from "googleapis";
import type { BookingRow } from "./booking-types";

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

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = "Sheet1";

export async function getBookingsForDate(
  date: string,
  arenaId: string = "arena-1"
): Promise<BookingRow[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:R`,
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

export async function getBookedSlotsForDate(
  date: string,
  arenaId: string = "arena-1"
): Promise<string[]> {
  const bookings = await getBookingsForDate(date, arenaId);
  return bookings.map((b) => b.timeSlot);
}

export async function getActiveBookingsByContact(
  email: string,
  phone: string
): Promise<BookingRow[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:R`,
  });

  const rows = res.data.values || [];
  const today = new Date().toISOString().split("T")[0];

  return rows
    .filter(
      (row) =>
        (row[3] === email || row[4] === phone) &&
        row[17] !== "cancelled" &&
        row[5] >= today
    )
    .map(rowToBooking);
}

export async function appendBooking(booking: BookingRow): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:R`,
    valueInputOption: "RAW",
    requestBody: {
      values: [bookingToRow(booking)],
    },
  });
}

export async function findBookingById(
  bookingId: string
): Promise<{ booking: BookingRow; rowIndex: number } | null> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:R`,
  });

  const rows = res.data.values || [];
  const index = rows.findIndex((row) => row[0] === bookingId);
  if (index === -1) return null;

  return { booking: rowToBooking(rows[index]), rowIndex: index + 2 };
}

export async function updateBookingCells(
  rowIndex: number,
  updates: Record<string, string>
): Promise<void> {
  const sheets = getSheets();
  const columnMap: Record<string, string> = {
    paymentStatus: "K",
    razorpayOrderId: "M",
    razorpayPaymentId: "N",
    status: "R",
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

export async function getExpiredPayAtCenterBookings(): Promise<{ booking: BookingRow; rowIndex: number }[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:R`,
  });

  const rows = res.data.values || [];
  const now = new Date();
  const expired: { booking: BookingRow; rowIndex: number }[] = [];

  rows.forEach((row, i) => {
    if (
      row[10] === "pay_at_center" &&
      row[17] !== "cancelled" &&
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
    b.bookingId,
    b.arenaId,
    b.name,
    b.email,
    b.phone,
    b.date,
    b.timeSlot,
    String(b.partySize),
    b.package,
    b.gamePreference,
    b.paymentStatus,
    b.paymentMethod,
    b.razorpayOrderId,
    b.razorpayPaymentId,
    String(b.amount),
    b.specialRequests,
    b.createdAt,
    b.status,
  ];
}

function rowToBooking(row: string[]): BookingRow {
  return {
    bookingId: row[0] || "",
    arenaId: row[1] || "arena-1",
    name: row[2] || "",
    email: row[3] || "",
    phone: row[4] || "",
    date: row[5] || "",
    timeSlot: row[6] || "",
    partySize: parseInt(row[7] || "1"),
    package: (row[8] || "solo") as BookingRow["package"],
    gamePreference: row[9] || "",
    paymentStatus: (row[10] || "pending") as BookingRow["paymentStatus"],
    paymentMethod: (row[11] || "pay_at_center") as BookingRow["paymentMethod"],
    razorpayOrderId: row[12] || "",
    razorpayPaymentId: row[13] || "",
    amount: parseInt(row[14] || "0"),
    specialRequests: row[15] || "",
    createdAt: row[16] || "",
    status: (row[17] || "confirmed") as BookingRow["status"],
  };
}

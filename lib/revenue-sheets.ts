import { google } from "googleapis";
import type {
  RevenueEntry,
  MonthlyCost,
  GroupType,
  PaymentMethod,
} from "./revenue-config";
import { DEFAULT_MONTHLY_COST } from "./revenue-config";
import { getBookingsForDate } from "./google-sheets";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const REVENUE_SHEET = "Revenue";
const COSTS_SHEET = "RevenueCosts";
const REVENUE_HEADER = [
  "id",
  "date",
  "source",
  "group_type",
  "players",
  "revenue",
  "payment_method",
  "notes",
  "created_at",
];
const COSTS_HEADER = ["month", "cost", "updated_at"];

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

async function ensureSheet(name: string, header: string[]): Promise<void> {
  const sheets = getSheets();
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${name}!A1`,
    });
  } catch {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: name } } }],
        },
      });
    } catch {
      // Sheet may already exist — a concurrent creator won the race.
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${name}!A1:${String.fromCharCode(64 + header.length)}1`,
      valueInputOption: "RAW",
      requestBody: { values: [header] },
    });
  }
}

function rowToEntry(row: string[]): RevenueEntry {
  return {
    id: row[0] || "",
    date: row[1] || "",
    source: row[2] === "booking" ? "booking" : "walkin",
    groupType: (row[3] as GroupType) || "solo",
    players: Number(row[4] || 0),
    revenue: Number(row[5] || 0),
    paymentMethod: (row[6] as PaymentMethod) || "cash",
    notes: row[7] || "",
    createdAt: row[8] || "",
  };
}

function entryToRow(e: RevenueEntry): string[] {
  return [
    e.id,
    e.date,
    e.source,
    e.groupType,
    String(e.players),
    String(e.revenue),
    e.paymentMethod,
    e.notes,
    e.createdAt,
  ];
}

// ─────────────── Walk-in CRUD ───────────────

// Returns non-deleted walk-in rows. A deleted walk-in is recognised by an
// empty id — matches how CustomGames handles removals (tombstone rather
// than shifting rows, which would invalidate row indices for concurrent
// writes).
export async function listWalkinRevenue(): Promise<RevenueEntry[]> {
  await ensureSheet(REVENUE_SHEET, REVENUE_HEADER);
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REVENUE_SHEET}!A2:I`,
  });
  const rows = (res.data.values || []) as string[][];
  return rows.filter((r) => r[0]).map(rowToEntry);
}

export async function appendWalkinRevenue(entry: RevenueEntry): Promise<void> {
  await ensureSheet(REVENUE_SHEET, REVENUE_HEADER);
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REVENUE_SHEET}!A:I`,
    valueInputOption: "RAW",
    requestBody: { values: [entryToRow(entry)] },
  });
}

async function findWalkinRowIndex(id: string): Promise<number> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REVENUE_SHEET}!A2:A`,
  });
  const rows = (res.data.values || []) as string[][];
  const idx = rows.findIndex((r) => r[0] === id);
  return idx === -1 ? -1 : idx + 2;
}

export async function updateWalkinRevenue(entry: RevenueEntry): Promise<boolean> {
  const rowIndex = await findWalkinRowIndex(entry.id);
  if (rowIndex === -1) return false;
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REVENUE_SHEET}!A${rowIndex}:I${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [entryToRow(entry)] },
  });
  return true;
}

export async function deleteWalkinRevenue(id: string): Promise<boolean> {
  const rowIndex = await findWalkinRowIndex(id);
  if (rowIndex === -1) return false;
  const sheets = getSheets();
  // Tombstone the row rather than shifting others down.
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REVENUE_SHEET}!A${rowIndex}:I${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [["", "", "", "", "", "", "", "", ""]] },
  });
  return true;
}

// ─────────────── Booking-derived revenue ───────────────

// Wraps confirmed+paid bookings from Sheet1 into RevenueEntry shape so the
// revenue tab can render them alongside walk-ins with a single data model.
// This is a read-only projection; the source of truth stays in Sheet1.
export async function listBookingRevenueBetween(
  fromDate: string,
  toDate: string
): Promise<RevenueEntry[]> {
  const days: string[] = [];
  const start = new Date(fromDate + "T00:00:00Z");
  const end = new Date(toDate + "T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }

  const all = await Promise.all(days.map((d) => getBookingsForDate(d)));
  const entries: RevenueEntry[] = [];
  for (const dayBookings of all) {
    for (const b of dayBookings) {
      // Only count bookings that were actually paid online. Cancelled rows
      // are already filtered by getBookingsForDate.
      if (b.paymentStatus !== "paid") continue;
      entries.push({
        id: `booking-${b.bookingId}`,
        date: b.date,
        source: "booking",
        groupType: b.package as GroupType,
        players: b.partySize,
        revenue: b.amount,
        paymentMethod: "razorpay",
        notes: b.gamePreference || "",
        createdAt: b.createdAt,
      });
    }
  }
  return entries;
}

// ─────────────── Monthly cost overrides ───────────────

// Returns the override map keyed by "YYYY-MM"; missing months fall back to
// DEFAULT_MONTHLY_COST at read time.
export async function listMonthlyCosts(): Promise<MonthlyCost[]> {
  await ensureSheet(COSTS_SHEET, COSTS_HEADER);
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${COSTS_SHEET}!A2:C`,
  });
  const rows = (res.data.values || []) as string[][];
  return rows
    .filter((r) => r[0])
    .map((r) => ({
      month: r[0],
      cost: Number(r[1] || DEFAULT_MONTHLY_COST),
      updatedAt: r[2] || "",
    }));
}

export async function setMonthlyCost(
  month: string,
  cost: number
): Promise<void> {
  await ensureSheet(COSTS_SHEET, COSTS_HEADER);
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${COSTS_SHEET}!A2:A`,
  });
  const rows = (res.data.values || []) as string[][];
  const idx = rows.findIndex((r) => r[0] === month);
  const now = new Date().toISOString();

  if (idx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${COSTS_SHEET}!A:C`,
      valueInputOption: "RAW",
      requestBody: { values: [[month, String(cost), now]] },
    });
  } else {
    const rowIndex = idx + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${COSTS_SHEET}!A${rowIndex}:C${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: [[month, String(cost), now]] },
    });
  }
}

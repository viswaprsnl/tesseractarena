import { google } from "googleapis";
import { normalizeCode } from "./discount-config";
import type { Discount, DiscountScope, DiscountType } from "./discount-config";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = "Discounts";
// Column I ("code") is the coupon gate — empty on legacy rows means the
// row is an auto-apply campaign, matching pre-coupon behaviour.
const HEADER = ["id", "label", "type", "value", "appliesTo", "startsOn", "endsOn", "active", "code"];

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

// Idempotently create the sheet + header row on first use. Also backfills
// the "code" header (col I) on sheets created before coupon support so
// admins can eyeball the column without a manual migration.
async function ensureSheet(): Promise<void> {
  const sheets = getSheets();
  let existed = true;
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
    });
  } catch {
    existed = false;
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
        },
      });
    } catch {
      // Sheet may already exist — a concurrent creator won the race.
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:I1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADER] },
    });
  }

  if (existed) {
    // Lightweight forward-migration: if the sheet already existed but has
    // no header for col I, add it. Header text is decorative — the data
    // itself is positional — so this is safe to run repeatedly.
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!I1`,
      });
      const cell = res.data.values?.[0]?.[0];
      if (!cell) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!I1`,
          valueInputOption: "RAW",
          requestBody: { values: [["code"]] },
        });
      }
    } catch {
      // Best-effort header backfill — data still reads/writes fine without it.
    }
  }
}

function rowToDiscount(row: string[]): Discount {
  return {
    id: row[0] || "",
    label: row[1] || "",
    type: (row[2] as DiscountType) || "percent",
    value: Number(row[3] || 0),
    appliesTo: (row[4] as DiscountScope) || "all",
    startsOn: row[5] || "",
    endsOn: row[6] || "",
    active: row[7] === "true" || row[7] === "TRUE",
    // Legacy rows written before coupon support just have 8 columns —
    // row[8] is undefined and we fall back to "" (auto-apply campaign).
    code: normalizeCode(row[8]),
  };
}

function discountToRow(d: Discount): string[] {
  return [
    d.id,
    d.label,
    d.type,
    String(d.value),
    d.appliesTo,
    d.startsOn,
    d.endsOn,
    d.active ? "true" : "false",
    normalizeCode(d.code),
  ];
}

export async function listDiscounts(): Promise<Discount[]> {
  await ensureSheet();
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:I`,
  });
  const rows = (res.data.values || []) as string[][];
  return rows.filter((r) => r[0]).map(rowToDiscount);
}

export async function appendDiscount(d: Discount): Promise<void> {
  await ensureSheet();
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:I`,
    valueInputOption: "RAW",
    requestBody: { values: [discountToRow(d)] },
  });
}

async function findRowIndex(id: string): Promise<number> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:A`,
  });
  const rows = (res.data.values || []) as string[][];
  const idx = rows.findIndex((r) => r[0] === id);
  return idx === -1 ? -1 : idx + 2;
}

export async function updateDiscount(d: Discount): Promise<boolean> {
  const rowIndex = await findRowIndex(d.id);
  if (rowIndex === -1) return false;
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${rowIndex}:I${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [discountToRow(d)] },
  });
  return true;
}

export async function deleteDiscount(id: string): Promise<boolean> {
  const rowIndex = await findRowIndex(id);
  if (rowIndex === -1) return false;
  const sheets = getSheets();
  // Clear the row (leaves an empty row rather than deleting — matches how
  // CustomGames handles removals and avoids reshuffling row indices).
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${rowIndex}:I${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [["", "", "", "", "", "", "", "", ""]] },
  });
  return true;
}

import { google } from "googleapis";
import type { Discount, DiscountScope, DiscountType } from "./discount-config";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = "Discounts";
const HEADER = ["id", "label", "type", "value", "appliesTo", "startsOn", "endsOn", "active"];

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

// Idempotently create the sheet + header row on first use.
async function ensureSheet(): Promise<void> {
  const sheets = getSheets();
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
    });
  } catch {
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
      range: `${SHEET_NAME}!A1:H1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADER] },
    });
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
  ];
}

export async function listDiscounts(): Promise<Discount[]> {
  await ensureSheet();
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:H`,
  });
  const rows = (res.data.values || []) as string[][];
  return rows.filter((r) => r[0]).map(rowToDiscount);
}

export async function appendDiscount(d: Discount): Promise<void> {
  await ensureSheet();
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:H`,
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
    range: `${SHEET_NAME}!A${rowIndex}:H${rowIndex}`,
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
    range: `${SHEET_NAME}!A${rowIndex}:H${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [["", "", "", "", "", "", "", ""]] },
  });
  return true;
}

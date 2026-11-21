import { google } from "googleapis";

// Shared Google Sheets client for the bookings spreadsheet.
export const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

export function getSheets() {
  const key = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "",
    "base64"
  ).toString("utf-8");
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

const ensured = new Set<string>();

// Create the tab with its header row if it doesn't exist yet. Cached per
// server instance so steady-state reads cost no extra round-trip.
export async function ensureSheet(name: string, header: string[]): Promise<void> {
  if (ensured.has(name)) return;
  const sheets = getSheets();
  try {
    await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${name}!A1` });
  } catch {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: name } } }] },
      });
    } catch {
      // Lost a creation race — the tab exists now.
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${name}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [header] },
    });
  }
  ensured.add(name);
}

export async function readRows(range: string): Promise<string[][]> {
  const res = await getSheets().spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  return (res.data.values || []) as string[][];
}

export async function appendRows(range: string, values: string[][]): Promise<void> {
  await getSheets().spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

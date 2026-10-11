import { google } from "googleapis";

// Simple key/value settings store, backed by a "Settings" tab in the
// bookings spreadsheet. Shape:
//
//   | key              | value | updatedAt            | updatedBy |
//   |------------------|-------|----------------------|-----------|
//   | advance_required | true  | 2026-10-11T05:00:00Z | admin     |
//
// Why a sheet row instead of an env var: admins can toggle these
// values on their own without a Vercel redeploy. Why not a DB: we
// already have the sheet, and this is the ONE moving config right
// now — rebuilding on Postgres for a boolean would be overkill.
//
// Design decisions:
//   - All values are stored as strings in the sheet; the typed
//     helpers below parse them. Keeps the sheet editable by hand
//     without format errors.
//   - 60-second in-memory cache so a hot admin flip propagates
//     within a minute without hammering the sheets API on every
//     booking.
//   - Unknown keys return the provided default — new flags can be
//     added without migrating existing rows.

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = "Settings";
const HEADER = ["key", "value", "updatedAt", "updatedBy"];

export interface SettingRow {
  key: string;
  value: string;
  updatedAt: string;
  updatedBy: string;
}

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

// Idempotent sheet + header creation. First boot and manual deletes
// both land here cleanly — if the sheet already exists we skip, if
// the header's wrong we rewrite it.
async function ensureSheet(): Promise<void> {
  const sheets = getSheets();
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
    });
    return;
  } catch {
    // not found — create it below
  }
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      },
    });
  } catch {
    // raced with another creator — fine
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:D1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADER] },
  });
}

// Cache cleared when any key is written. 60s TTL on reads so booking
// flow latency doesn't take a sheet round-trip on every POST.
let _cache: { at: number; rows: SettingRow[] } | null = null;
const CACHE_TTL_MS = 60_000;

function readRows(values: string[][]): SettingRow[] {
  return values.map((r) => ({
    key: r[0] || "",
    value: r[1] || "",
    updatedAt: r[2] || "",
    updatedBy: r[3] || "",
  }));
}

export async function listSettings(): Promise<SettingRow[]> {
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) {
    return _cache.rows;
  }
  await ensureSheet();
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:D`,
  });
  const rows = readRows((res.data.values || []) as string[][]);
  _cache = { at: Date.now(), rows };
  return rows;
}

export async function getSetting(key: string): Promise<SettingRow | undefined> {
  const rows = await listSettings();
  return rows.find((r) => r.key === key);
}

export async function setSetting(
  key: string,
  value: string,
  updatedBy: string
): Promise<void> {
  await ensureSheet();
  const sheets = getSheets();
  // Full read to find the row id if the key exists, otherwise append.
  // One extra read on each write is fine — writes are rare (admin
  // tweaks, not booking traffic).
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:D`,
  });
  const rows = (res.data.values || []) as string[][];
  const existingIdx = rows.findIndex((r) => r[0] === key);
  const updatedAt = new Date().toISOString();
  const row = [key, value, updatedAt, updatedBy];
  if (existingIdx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  } else {
    const sheetRow = existingIdx + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${sheetRow}:D${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  }
  _cache = null;
}

// ─────────────── Typed accessors ───────────────
//
// Group all app-level flag parsing in one place so the server-side
// callers never spell a key wrong and the booking wizard reads the
// same shape as the admin UI.

export const SETTING_KEYS = {
  ADVANCE_REQUIRED: "advance_required",
} as const;

// advance_required defaults to true — i.e. the historical behavior
// (collect ₹500/head at booking). Flipping the sheet value to "false"
// opts into the no-advance experiment.
export async function getAdvanceRequired(): Promise<boolean> {
  const row = await getSetting(SETTING_KEYS.ADVANCE_REQUIRED);
  if (!row) return true;
  const v = row.value.trim().toLowerCase();
  return v !== "false" && v !== "0" && v !== "no" && v !== "off";
}

// Call this ONLY from an admin-authenticated endpoint — the write
// itself has no auth; the endpoint owns that check.
export async function setAdvanceRequired(
  value: boolean,
  updatedBy: string
): Promise<void> {
  await setSetting(SETTING_KEYS.ADVANCE_REQUIRED, String(value), updatedBy);
}

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

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

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = "Schedule";

async function ensureSheet() {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
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
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:E1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["date", "type", "slots", "reason", "updated_at"]],
        },
      });
    } catch {
      // May already exist
    }
  }
}

// GET — fetch schedule blocks for a date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    await ensureSheet();
    const sheets = google.sheets({ version: "v4", auth: getAuth() });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:E`,
    });

    const rows = (res.data.values || []) as string[][];

    interface ScheduleBlock {
      date: string;
      type: "day_blocked" | "slots_blocked";
      blockedSlots: string[];
      reason: string;
    }

    const blocks: Record<string, ScheduleBlock> = {};
    rows.forEach((row) => {
      if (row[0]) {
        blocks[row[0]] = {
          date: row[0],
          type: row[1] as "day_blocked" | "slots_blocked",
          blockedSlots: row[2] ? row[2].split(",") : [],
          reason: row[3] || "",
        };
      }
    });

    if (date) {
      return NextResponse.json({ block: blocks[date] || null });
    }

    return NextResponse.json({ blocks });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch schedule", details: message },
      { status: 500 }
    );
  }
}

// POST — block/unblock slots or days
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin, action, date, slots, reason } = body;

    const adminPin = process.env.ADMIN_PIN || "1234";
    if (pin !== adminPin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!date || !action) {
      return NextResponse.json(
        { error: "date and action are required" },
        { status: 400 }
      );
    }

    await ensureSheet();
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const now = new Date().toISOString();

    // Find existing row for this date
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:E`,
    });
    const rows = (res.data.values || []) as string[][];
    const existingIdx = rows.findIndex((r) => r[0] === date);

    if (action === "block_day") {
      const rowData = [date, "day_blocked", "", reason || "Day off", now];
      if (existingIdx >= 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A${existingIdx + 2}:E${existingIdx + 2}`,
          valueInputOption: "RAW",
          requestBody: { values: [rowData] },
        });
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:E`,
          valueInputOption: "RAW",
          requestBody: { values: [rowData] },
        });
      }
      return NextResponse.json({ success: true, action: "day_blocked", date });
    }

    if (action === "block_slots" && slots?.length > 0) {
      // Merge with existing blocked slots
      let existingSlots: string[] = [];
      if (existingIdx >= 0 && rows[existingIdx][1] === "slots_blocked") {
        existingSlots = rows[existingIdx][2] ? rows[existingIdx][2].split(",") : [];
      }
      const merged = [...new Set([...existingSlots, ...slots])].sort();
      const rowData = [date, "slots_blocked", merged.join(","), reason || "", now];

      if (existingIdx >= 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A${existingIdx + 2}:E${existingIdx + 2}`,
          valueInputOption: "RAW",
          requestBody: { values: [rowData] },
        });
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:E`,
          valueInputOption: "RAW",
          requestBody: { values: [rowData] },
        });
      }
      return NextResponse.json({ success: true, action: "slots_blocked", date, slots: merged });
    }

    if (action === "unblock_slots" && slots?.length > 0) {
      if (existingIdx >= 0) {
        const existingSlots = rows[existingIdx][2] ? rows[existingIdx][2].split(",") : [];
        const remaining = existingSlots.filter((s: string) => !slots.includes(s));
        if (remaining.length === 0) {
          // Clear the row entirely
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A${existingIdx + 2}:E${existingIdx + 2}`,
            valueInputOption: "RAW",
            requestBody: { values: [["", "", "", "", ""]] },
          });
        } else {
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A${existingIdx + 2}:E${existingIdx + 2}`,
            valueInputOption: "RAW",
            requestBody: { values: [[date, "slots_blocked", remaining.join(","), reason || rows[existingIdx][3] || "", now]] },
          });
        }
      }
      return NextResponse.json({ success: true, action: "unblocked", date });
    }

    if (action === "reset_day") {
      if (existingIdx >= 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A${existingIdx + 2}:E${existingIdx + 2}`,
          valueInputOption: "RAW",
          requestBody: { values: [["", "", "", "", ""]] },
        });
      }
      return NextResponse.json({ success: true, action: "reset", date });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update schedule", details: message },
      { status: 500 }
    );
  }
}

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
const SHEET_NAME = "GameStatus";

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
        range: `${SHEET_NAME}!A1:D1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["game_id", "status", "note", "updated_at"]],
        },
      });
    } catch {
      // Sheet might already exist
    }
  }
}

// GET — fetch all game statuses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get("pin");
    const adminPin = process.env.ADMIN_PIN || "1234";
    const isAdmin = pin === adminPin;

    await ensureSheet();

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:D`,
    });

    const rows = (res.data.values || []) as string[][];
    const statuses: Record<string, { status: string; note: string; updatedAt: string }> = {};

    rows.forEach((row) => {
      if (row[0]) {
        statuses[row[0]] = {
          status: row[1] || "available",
          note: row[2] || "",
          updatedAt: row[3] || "",
        };
      }
    });

    // For public access (no pin), only return status info
    if (!isAdmin) {
      return NextResponse.json({ statuses });
    }

    return NextResponse.json({ statuses });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch game statuses", details: message },
      { status: 500 }
    );
  }
}

// POST — update a game's status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin, gameId, status, note } = body;

    const adminPin = process.env.ADMIN_PIN || "1234";
    if (pin !== adminPin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!gameId || !status) {
      return NextResponse.json(
        { error: "gameId and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["available", "unavailable", "coming_soon", "maintenance"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    await ensureSheet();

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const now = new Date().toISOString();

    // Check if game already has a row
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:D`,
    });

    const rows = (res.data.values || []) as string[][];
    const existingIndex = rows.findIndex((row) => row[0] === gameId);

    if (existingIndex >= 0) {
      // Update existing row
      const rowNum = existingIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A${rowNum}:D${rowNum}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[gameId, status, note || "", now]],
        },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:D`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[gameId, status, note || "", now]],
        },
      });
    }

    return NextResponse.json({
      success: true,
      gameId,
      status,
      note: note || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update game status", details: message },
      { status: 500 }
    );
  }
}

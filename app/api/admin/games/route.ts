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
        range: `${SHEET_NAME}!A1:F1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["game_id", "status", "note", "updated_at", "video_url", "hidden"]],
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
      range: `${SHEET_NAME}!A2:F`,
    });

    const rows = (res.data.values || []) as string[][];
    const statuses: Record<string, { status: string; note: string; updatedAt: string; videoUrl: string; hidden: boolean }> = {};

    rows.forEach((row) => {
      if (row[0]) {
        statuses[row[0]] = {
          status: row[1] || "available",
          note: row[2] || "",
          updatedAt: row[3] || "",
          videoUrl: row[4] || "",
          hidden: row[5] === "true",
        };
      }
    });

    // Read custom games from CustomGames sheet
    let customGames: Array<{
      id: string; title: string; provider: string; description: string;
      players: string; genre: string; duration: string; difficulty: string;
      image: string; videoUrl: string; tags: string;
    }> = [];
    try {
      const customRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "CustomGames!A2:K",
      });
      const customRows = (customRes.data.values || []) as string[][];
      customGames = customRows
        .filter((r) => r[0] && r[10] !== "deleted")
        .map((r) => ({
          id: r[0] || "",
          title: r[1] || "",
          provider: r[2] || "synthesis",
          description: r[3] || "",
          players: r[4] || "1-4",
          genre: r[5] || "",
          duration: r[6] || "30 min",
          difficulty: r[7] || "Medium",
          image: r[8] || "",
          videoUrl: r[9] || "",
          tags: r[10] || "",
        }));
    } catch {
      // CustomGames sheet may not exist yet
    }

    return NextResponse.json({ statuses, customGames });
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
    const { pin, gameId, status, note, videoUrl, hidden, action, newGame } = body;

    const adminPin = process.env.ADMIN_PIN || "1234";
    if (pin !== adminPin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const now = new Date().toISOString();

    // Handle adding a new custom game
    if (action === "add_game" && newGame) {
      try {
        await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "CustomGames!A1",
        });
      } catch {
        try {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
              requests: [{ addSheet: { properties: { title: "CustomGames" } } }],
            },
          });
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: "CustomGames!A1:K1",
            valueInputOption: "RAW",
            requestBody: {
              values: [["id", "title", "provider", "description", "players", "genre", "duration", "difficulty", "image", "video_url", "tags"]],
            },
          });
        } catch {
          // May already exist
        }
      }

      const gameId = `custom-${Date.now()}`;
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "CustomGames!A:K",
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            gameId,
            newGame.title || "",
            newGame.provider || "synthesis",
            newGame.description || "",
            newGame.players || "1-4",
            newGame.genre || "",
            newGame.duration || "30 min",
            newGame.difficulty || "Medium",
            newGame.image || "",
            newGame.videoUrl || "",
            newGame.tags || "",
          ]],
        },
      });

      return NextResponse.json({ success: true, gameId, action: "added" });
    }

    // Handle deleting a custom game
    if (action === "delete_game" && gameId) {
      try {
        const customRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "CustomGames!A2:K",
        });
        const customRows = (customRes.data.values || []) as string[][];
        const idx = customRows.findIndex((r) => r[0] === gameId);
        if (idx >= 0) {
          const rowNum = idx + 2;
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `CustomGames!K${rowNum}`,
            valueInputOption: "RAW",
            requestBody: { values: [["deleted"]] },
          });
          return NextResponse.json({ success: true, gameId, action: "deleted" });
        }
      } catch {
        // CustomGames sheet may not exist
      }
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
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

    // Check if game already has a row
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:F`,
    });

    const rows = (res.data.values || []) as string[][];
    const existingIndex = rows.findIndex((row) => row[0] === gameId);
    const existingVideoUrl = existingIndex >= 0 ? (rows[existingIndex][4] || "") : "";
    const existingHidden = existingIndex >= 0 ? (rows[existingIndex][5] || "false") : "false";
    const finalVideoUrl = videoUrl !== undefined ? videoUrl : existingVideoUrl;
    const finalHidden = hidden !== undefined ? String(hidden) : existingHidden;

    if (existingIndex >= 0) {
      const rowNum = existingIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A${rowNum}:F${rowNum}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[gameId, status, note || "", now, finalVideoUrl, finalHidden]],
        },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:F`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[gameId, status, note || "", now, finalVideoUrl, finalHidden]],
        },
      });
    }

    return NextResponse.json({
      success: true,
      gameId,
      status,
      note: note || "",
      videoUrl: finalVideoUrl,
      hidden: finalHidden === "true",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update game status", details: message },
      { status: 500 }
    );
  }
}

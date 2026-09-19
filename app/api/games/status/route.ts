import { NextResponse } from "next/server";
import { google } from "googleapis";

// Public read-only endpoint for game status + custom games. The
// /games catalog, home GamesLibrary, and booking wizard all need to
// know which titles are hidden / coming-soon and to fetch admin-added
// custom titles. This route returns ONLY the fields those UIs need —
// intentionally sanitized so /api/admin/games can stay locked down.
//
// Fields intentionally omitted vs the admin endpoint:
//   - updatedAt (internal ops timestamp; reveals admin activity cadence)
// Fields kept:
//   - status  ("available" | "coming_soon" | "unavailable" | "maintenance")
//   - note    (customer-visible explainer like "Launching October")
//   - videoUrl (trailer link, already public)
//   - hidden  (drives client-side filtering — meta only)

function getAuth() {
  const privateKey = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "",
    "base64"
  ).toString("utf-8");
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = "GameStatus";

export async function GET() {
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });

    // GameStatus sheet — public columns only. Column D (updated_at) is
    // read but not returned.
    let statuses: Record<
      string,
      { status: string; note: string; videoUrl: string; hidden: boolean }
    > = {};
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A2:F`,
      });
      const rows = (res.data.values || []) as string[][];
      statuses = rows.reduce(
        (acc, row) => {
          if (row[0]) {
            acc[row[0]] = {
              status: row[1] || "available",
              note: row[2] || "",
              videoUrl: row[4] || "",
              hidden: row[5] === "true",
            };
          }
          return acc;
        },
        {} as typeof statuses
      );
    } catch {
      // Sheet may not exist yet — return empty statuses.
    }

    // Custom games — admin-added titles rendered on the public catalog.
    // Same schema as /api/admin/games so consumers don't diverge.
    let customGames: Array<{
      id: string;
      title: string;
      category: string;
      description: string;
      players: string;
      genre: string;
      duration: string;
      difficulty: string;
      image: string;
      videoUrl: string;
      tags: string;
    }> = [];
    try {
      const customRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "CustomGames!A2:K",
      });
      const customRows = (customRes.data.values || []) as string[][];
      customGames = customRows
        .filter((r) => r[0] && r[10] !== "deleted")
        .map((r) => {
          const raw = r[2] || "";
          const category =
            raw === "available" || raw === "coming_soon" ? raw : "coming_soon";
          return {
            id: r[0] || "",
            title: r[1] || "",
            category,
            description: r[3] || "",
            players: r[4] || "1-4",
            genre: r[5] || "",
            duration: r[6] || "30 min",
            difficulty: r[7] || "Medium",
            image: r[8] || "",
            videoUrl: r[9] || "",
            tags: r[10] || "",
          };
        });
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

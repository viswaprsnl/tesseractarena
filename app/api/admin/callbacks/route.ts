import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { z } from "zod";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

// Callback requests are captured by /api/callback and land in the
// "Callbacks" sheet with columns A-D (name / phone / requested_at /
// status). This admin route lists them for the dashboard and lets the
// staff flip status → "addressed" so the row is retired from the
// pending list. Adds column E (addressed_at) on that write so we know
// when a request was closed out.

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
const SHEET_NAME = "Callbacks";

// Resolution outcomes we surface on the admin dashboard. "addressed" is
// the legacy value written by earlier versions of this route — kept as a
// bucket so old rows still render.
export type CallbackOutcome =
  | "pending"
  | "booked"      // Customer actually booked a session/party after the call
  | "enquiry"     // Answered their questions; no immediate booking
  | "no_answer"   // Couldn't reach the customer
  | "not_now"     // Customer declined or deferred
  | "addressed";  // Legacy — before outcome buckets existed

export interface CallbackRow {
  rowIndex: number;    // Real 1-indexed row in the sheet (headers = row 1)
  name: string;
  phone: string;
  requestedAt: string; // ISO
  status: CallbackOutcome;
  addressedAt: string; // ISO or empty
}

const OUTCOME_VALUES: CallbackOutcome[] = [
  "pending",
  "booked",
  "enquiry",
  "no_answer",
  "not_now",
  "addressed",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get("pin");
    const adminPin = process.env.ADMIN_PIN || "1234";
    if (pin !== adminPin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sheets = google.sheets({ version: "v4", auth: getAuth() });

    // Read A2:E — 4 original columns plus addressed_at. Missing sheet
    // is treated as an empty list so a brand-new install doesn't 404.
    let rows: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A2:E`,
      });
      rows = (res.data.values || []) as string[][];
    } catch {
      rows = [];
    }

    const callbacks: CallbackRow[] = rows.map((row, i) => {
      const rawStatus = (row[3] || "pending").toLowerCase().trim();
      const status: CallbackOutcome = OUTCOME_VALUES.includes(
        rawStatus as CallbackOutcome
      )
        ? (rawStatus as CallbackOutcome)
        : "pending";
      return {
        rowIndex: i + 2,
        name: row[0] || "",
        phone: row[1] || "",
        requestedAt: row[2] || "",
        status,
        addressedAt: row[4] || "",
      };
    });

    // Newest first — sort by requestedAt desc, with pending on top so
    // "what needs handling right now" is at the top of the table.
    callbacks.sort((a, b) => {
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      return b.requestedAt.localeCompare(a.requestedAt);
    });

    const pending = callbacks.filter((c) => c.status === "pending").length;

    return NextResponse.json({
      callbacks,
      pending,
      total: callbacks.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Callbacks list error:", message);
    return NextResponse.json(
      { error: "Failed to load callbacks" },
      { status: 500 }
    );
  }
}

// Resolve → sets column D to the picked outcome (booked / enquiry /
// no_answer / not_now) and column E to the current IST timestamp.
// Reopen → sets column D back to "pending" and clears column E.
const actionSchema = z.object({
  pin: z.string().min(1),
  action: z.enum(["resolve", "reopen"]),
  rowIndex: z.number().int().min(2),
  outcome: z.enum(["booked", "enquiry", "no_answer", "not_now"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }
    const adminPin = process.env.ADMIN_PIN || "1234";
    if (parsed.data.pin !== adminPin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, rowIndex, outcome } = parsed.data;
    const sheets = google.sheets({ version: "v4", auth: getAuth() });

    const nowIST = toZonedTime(new Date(), "Asia/Kolkata");
    const addressedAt = format(nowIST, "yyyy-MM-dd'T'HH:mm:ssxxx");

    if (action === "resolve") {
      if (!outcome) {
        return NextResponse.json(
          { error: "Resolution outcome is required" },
          { status: 400 }
        );
      }
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          valueInputOption: "RAW",
          data: [
            {
              range: `${SHEET_NAME}!D${rowIndex}`,
              values: [[outcome]],
            },
            {
              range: `${SHEET_NAME}!E${rowIndex}`,
              values: [[addressedAt]],
            },
          ],
        },
      });
    } else {
      // Reopen — clear addressed_at so the audit trail reflects that the
      // request came back into the pending queue.
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          valueInputOption: "RAW",
          data: [
            {
              range: `${SHEET_NAME}!D${rowIndex}`,
              values: [["pending"]],
            },
            {
              range: `${SHEET_NAME}!E${rowIndex}`,
              values: [[""]],
            },
          ],
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Callbacks update error:", message);
    return NextResponse.json(
      { error: "Failed to update callback" },
      { status: 500 }
    );
  }
}

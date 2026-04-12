import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { google } from "googleapis";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const waiverSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  age: z.number().int().min(5).max(120),
  emergencyContact: z.string().min(2).max(100),
  emergencyPhone: z.string().min(10).max(15),
  isGuardian: z.boolean(),
  minorName: z.string().optional(),
  minorAge: z.number().optional(),
  mediaConsent: z.boolean(),
  signature: z.string().min(2, "Signature is required"),
  bookingId: z.string().optional(),
});

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = waiverSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const nowIST = toZonedTime(new Date(), "Asia/Kolkata");
    const signedAt = format(nowIST, "yyyy-MM-dd'T'HH:mm:ssxxx");

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    // Check if Waivers sheet exists, create headers if needed
    try {
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Waivers!A1",
      });
    } catch {
      // Sheet might not exist — try to add it
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: { title: "Waivers" },
                },
              },
            ],
          },
        });
        // Add headers
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: "Waivers!A1:L1",
          valueInputOption: "RAW",
          requestBody: {
            values: [
              [
                "name",
                "email",
                "phone",
                "age",
                "emergency_contact",
                "emergency_phone",
                "is_guardian",
                "minor_name",
                "minor_age",
                "media_consent",
                "signature",
                "booking_id",
                "signed_at",
              ],
            ],
          },
        });
      } catch {
        // Sheet might already exist with different error
      }
    }

    // Append waiver data
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Waivers!A:M",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            data.name,
            data.email,
            data.phone,
            String(data.age),
            data.emergencyContact,
            data.emergencyPhone,
            data.isGuardian ? "Yes" : "No",
            data.minorName || "",
            data.minorAge ? String(data.minorAge) : "",
            data.mediaConsent ? "Yes" : "No",
            data.signature,
            data.bookingId || "",
            signedAt,
          ],
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Waiver signed successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error saving waiver:", message);
    return NextResponse.json(
      { error: "Failed to save waiver", details: message },
      { status: 500 }
    );
  }
}

// GET — lookup waiver by email (for center check-in)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    let rows: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Waivers!A2:M",
      });
      rows = (res.data.values || []) as string[][];
    } catch {
      return NextResponse.json({ signed: false, waivers: [] });
    }

    const waivers = rows
      .filter((row) => row[1]?.toLowerCase() === email.toLowerCase())
      .map((row) => ({
        name: row[0],
        email: row[1],
        phone: row[2],
        signedAt: row[12],
        bookingId: row[11] || null,
      }));

    return NextResponse.json({
      signed: waivers.length > 0,
      waivers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to check waiver", details: message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { google } from "googleapis";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const callbackSchema = z.object({
  phone: z.string().min(8).max(20),
  name: z.string().max(100).optional(),
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

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = "Callbacks";

async function ensureSheet(sheets: ReturnType<typeof google.sheets>) {
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
          values: [["name", "phone", "requested_at", "status"]],
        },
      });
    } catch {
      // May already exist
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = callbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid phone number" },
        { status: 400 }
      );
    }

    const { phone, name } = parsed.data;
    const nowIST = toZonedTime(new Date(), "Asia/Kolkata");
    const requestedAt = format(nowIST, "yyyy-MM-dd'T'HH:mm:ssxxx");

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    await ensureSheet(sheets);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[name || "", phone, requestedAt, "pending"]],
      },
    });

    // Notify owner via Resend
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Tesseract Arena <bookings@tesseractarena.com>",
        to: ["venkattessearact@gmail.com", "viswatesseract@gmail.com"],
        subject: `Callback Request: ${phone}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Callback Request</h2>
            <p><strong>Phone:</strong> ${phone}</p>
            ${name ? `<p><strong>Name:</strong> ${name}</p>` : ""}
            <p><strong>Requested:</strong> ${requestedAt}</p>
            <p>Call this customer back as soon as possible.</p>
          </div>
        `,
      });
    } catch {
      // Email failure shouldn't block the callback request
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Callback error:", message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

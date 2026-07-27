import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { google } from "googleapis";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  subject: z.string().min(2).max(150),
  message: z.string().min(10).max(4000),
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
const SHEET_NAME = "ContactMessages";

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
        range: `${SHEET_NAME}!A1:E1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["received_at", "name", "email", "subject", "message"]],
        },
      });
    } catch {
      // Sheet may already exist — concurrent creator won the race.
    }
  }
}

// Escape user-supplied text before dropping it into HTML email body.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check the form and try again.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = parsed.data;
    const nowIST = toZonedTime(new Date(), "Asia/Kolkata");
    const receivedAt = format(nowIST, "yyyy-MM-dd'T'HH:mm:ssxxx");

    // Paper trail in Sheets — even if email delivery fails the message survives.
    try {
      const sheets = google.sheets({ version: "v4", auth: getAuth() });
      await ensureSheet(sheets);
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:E`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[receivedAt, name, email, subject, message]],
        },
      });
    } catch (err) {
      console.error("Contact sheet append failed:", err);
    }

    // Notify owner via Resend. Reply-To is the sender so hitting reply in
    // the inbox goes straight back to the customer.
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Tesseract Arena <bookings@tesseractarena.com>",
        to: ["admin@tesseractarena.com"],
        replyTo: email,
        subject: `[Contact] ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h2 style="margin-bottom: 4px;">New contact form message</h2>
            <p style="color: #888; font-size: 12px; margin-top: 0;">Received ${escapeHtml(receivedAt)}</p>
            <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
            <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
            <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Contact email send failed:", err);
      // Do not fail the request — the message is already in the sheet.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    console.error("Contact form error:", messageText);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

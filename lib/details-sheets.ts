import type { BookingDetails } from "./ops-config";
import { appendRows, ensureSheet, getSheets, readRows, SPREADSHEET_ID } from "./sheets";

// One row per booking that has event / games-played / invoice data:
// bookingId | JSON details | updatedAt. Kept off Sheet1 so its fixed
// columns (and the public booking flow that writes them) stay untouched.
const DETAILS = "Details";
const HEADER = ["bookingId", "details", "updatedAt"];

const parse = (json: string | undefined): BookingDetails => {
  try {
    return JSON.parse(json || "{}");
  } catch {
    return {};
  }
};

export async function listDetails(): Promise<Map<string, BookingDetails>> {
  await ensureSheet(DETAILS, HEADER);
  return new Map((await readRows(`${DETAILS}!A2:B`)).filter((r) => r[0]).map((r) => [r[0], parse(r[1])]));
}

export async function getDetails(bookingId: string): Promise<BookingDetails> {
  return (await listDetails()).get(bookingId) ?? {};
}

// Merges `patch` into the stored details and returns the result.
export async function saveDetails(bookingId: string, patch: BookingDetails): Promise<BookingDetails> {
  await ensureSheet(DETAILS, HEADER);
  const rows = await readRows(`${DETAILS}!A2:B`);
  const idx = rows.findIndex((r) => r[0] === bookingId);
  const next = { ...(idx === -1 ? {} : parse(rows[idx][1])), ...patch };
  const values = [[bookingId, JSON.stringify(next), new Date().toISOString()]];
  if (idx === -1) await appendRows(`${DETAILS}!A:A`, values);
  else
    await getSheets().spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${DETAILS}!A${idx + 2}:C${idx + 2}`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  return next;
}

// Sequential GST invoice number per Indian financial year (Apr–Mar),
// e.g. TA-2627-0007. Assigned once, when a booking is completed.
export async function nextInvoiceNo(): Promise<string> {
  const now = new Date(Date.now() + 5.5 * 3600_000); // IST
  const y = now.getUTCFullYear() % 100 - (now.getUTCMonth() < 3 ? 1 : 0);
  const prefix = `TA-${y}${y + 1}-`;
  const used = [...(await listDetails()).values()].filter((d) => d.invoiceNo?.startsWith(prefix)).length;
  return `${prefix}${String(used + 1).padStart(4, "0")}`;
}

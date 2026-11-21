import { nanoid } from "nanoid";
import { formatInTimeZone } from "date-fns-tz";
import type { CollectedVia } from "./booking-types";
import type { Expense, ExpenseCategory } from "./revenue-config";
import { appendRows, ensureSheet, getSheets, readRows, SPREADSHEET_ID } from "./sheets";

// Money ledger. Every rupee received is one Payments row dated the day it
// was collected (IST), so "received on a day" and the cash count come from
// here rather than from the booking row. Amounts are ex-GST, like Sheet1.
const PAYMENTS = "Payments";
const PAYMENTS_HEADER = ["id", "bookingId", "date", "at", "amount", "method", "ref", "by"];
const EXPENSES = "Expenses";
const EXPENSES_HEADER = ["id", "date", "category", "amount", "note", "createdAt", "by"];

export interface Payment {
  id: string;
  bookingId: string;
  date: string;
  at: string;
  amount: number;
  method: CollectedVia;
  ref: string; // Razorpay payment id when online
  by: string;
}

// Best-effort: a ledger hiccup must never fail a checkout that already
// succeeded. Anything missing here is still counted by the calendar from
// the booking row's amountPaid (see /api/admin/calendar).
export async function recordPayment(
  p: Pick<Payment, "bookingId" | "amount" | "method"> & Partial<Pick<Payment, "ref" | "by">>
): Promise<void> {
  if (p.amount <= 0) return;
  const now = new Date();
  try {
    await ensureSheet(PAYMENTS, PAYMENTS_HEADER);
    await appendRows(`${PAYMENTS}!A:A`, [[
      `pay-${nanoid(8)}`,
      p.bookingId,
      formatInTimeZone(now, "Asia/Kolkata", "yyyy-MM-dd"),
      now.toISOString(),
      String(p.amount),
      p.method,
      p.ref || "",
      p.by || "system",
    ]]);
  } catch (err) {
    console.error(`recordPayment failed for ${p.bookingId}:`, err);
  }
}

// verify + webhook can both record the same Razorpay payment; the ref
// dedupes them here instead of needing a lock on write.
export async function listPayments(): Promise<Payment[]> {
  await ensureSheet(PAYMENTS, PAYMENTS_HEADER);
  const seen = new Set<string>();
  return (await readRows(`${PAYMENTS}!A2:H`))
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0], bookingId: r[1] || "", date: r[2] || "", at: r[3] || "",
      amount: Number(r[4] || 0), method: (r[5] || "cash") as CollectedVia,
      ref: r[6] || "", by: r[7] || "",
    }))
    .filter((p) => !p.ref || (!seen.has(p.ref) && !!seen.add(p.ref)));
}

export async function listExpenses(): Promise<Expense[]> {
  await ensureSheet(EXPENSES, EXPENSES_HEADER);
  return (await readRows(`${EXPENSES}!A2:G`))
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0], date: r[1] || "", category: (r[2] || "other") as ExpenseCategory,
      amount: Number(r[3] || 0), note: r[4] || "", by: r[6] || "",
    }));
}

export async function addExpense(e: Omit<Expense, "id">, by: string): Promise<Expense> {
  await ensureSheet(EXPENSES, EXPENSES_HEADER);
  const expense = { ...e, id: `exp-${nanoid(8)}` };
  await appendRows(`${EXPENSES}!A:A`, [[
    expense.id, e.date, e.category, String(e.amount), e.note, new Date().toISOString(), by,
  ]]);
  return expense;
}

// Tombstone (blank the row) rather than shift rows under concurrent writers.
export async function deleteExpense(id: string): Promise<boolean> {
  const ids = await readRows(`${EXPENSES}!A2:A`);
  const idx = ids.findIndex((r) => r[0] === id);
  if (idx === -1) return false;
  await getSheets().spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${EXPENSES}!A${idx + 2}:G${idx + 2}`,
    valueInputOption: "RAW",
    requestBody: { values: [EXPENSES_HEADER.map(() => "")] },
  });
  return true;
}

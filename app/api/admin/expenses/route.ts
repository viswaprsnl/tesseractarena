import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { roleForPin } from "@/lib/admin-auth";
import { addExpense, deleteExpense, listExpenses } from "@/lib/ledger-sheets";
import { EXPENSE_CATEGORIES, STAFF_EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/revenue-config";

// Owner sees and logs everything. Staff log day-to-day costs (wages,
// supplies, food partner) and see / delete only staff entries.
const roleOf = (request: NextRequest) => roleForPin(new URL(request.url).searchParams.get("pin"));

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const expenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(Object.keys(EXPENSE_CATEGORIES) as [ExpenseCategory, ...ExpenseCategory[]]),
  amount: z.number().int().positive(),
  note: z.string().trim().max(200).default(""),
});

// GET ?month=YYYY-MM
export async function GET(request: NextRequest) {
  const role = roleOf(request);
  if (!role) return unauthorized();
  const month = new URL(request.url).searchParams.get("month") || "";
  const expenses = (await listExpenses()).filter((e) => e.date.startsWith(month) && (role === "owner" || e.by === "staff"));
  return NextResponse.json({ expenses: expenses.sort((a, b) => b.date.localeCompare(a.date)) });
}

export async function POST(request: NextRequest) {
  const role = roleOf(request);
  if (!role) return unauthorized();
  const parsed = expenseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  if (role === "staff" && !STAFF_EXPENSE_CATEGORIES.includes(parsed.data.category)) {
    return NextResponse.json({ error: "Owner PIN required for this category" }, { status: 403 });
  }
  return NextResponse.json({ expense: await addExpense(parsed.data, role) });
}

// DELETE ?id=exp-…
export async function DELETE(request: NextRequest) {
  const role = roleOf(request);
  if (!role) return unauthorized();
  const id = new URL(request.url).searchParams.get("id") || "";
  if (role === "staff" && (await listExpenses()).find((e) => e.id === id)?.by !== "staff") {
    return NextResponse.json({ error: "Owner PIN required" }, { status: 403 });
  }
  if (!(await deleteExpense(id))) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

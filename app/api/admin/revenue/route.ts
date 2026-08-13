import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  listWalkinRevenue,
  appendWalkinRevenue,
  updateWalkinRevenue,
  deleteWalkinRevenue,
  listBookingRevenueBetween,
  listMonthlyCosts,
} from "@/lib/revenue-sheets";
import type { RevenueEntry } from "@/lib/revenue-config";

const entryBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(["booking", "walkin"]).default("walkin"),
  groupType: z.enum(["solo", "squad", "party"]),
  players: z.number().int().min(1).max(50),
  revenue: z.number().int().min(0),
  paymentMethod: z.enum(["cash", "upi", "card", "razorpay"]),
  notes: z.string().max(200).optional().default(""),
});

function checkPin(request: NextRequest): boolean {
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get("pin");
  const adminPin = process.env.ADMIN_PIN || "1234";
  return pin === adminPin;
}

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD — returns walk-ins + booking-derived
// entries merged into one list plus the monthly cost overrides. Filtering
// happens after the merge so a single range covers both sources.
export async function GET(request: NextRequest) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json(
        { error: "from and to are required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const [walkins, bookings, costs] = await Promise.all([
      listWalkinRevenue(),
      listBookingRevenueBetween(from, to),
      listMonthlyCosts(),
    ]);

    const inRange = (e: RevenueEntry) => e.date >= from && e.date <= to;
    const entries = [...walkins.filter(inRange), ...bookings];

    return NextResponse.json({ entries, costs });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Revenue GET failed:", message);
    return NextResponse.json(
      { error: "Failed to load revenue", details: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const parsed = entryBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    // Only walk-ins can be added manually. Bookings come from Sheet1.
    if (parsed.data.source === "booking") {
      return NextResponse.json(
        { error: "Booking-source entries come from the booking flow, not manual add" },
        { status: 400 }
      );
    }
    const entry: RevenueEntry = {
      id: `walk-${nanoid(8).toLowerCase()}`,
      date: parsed.data.date,
      source: "walkin",
      groupType: parsed.data.groupType,
      players: parsed.data.players,
      revenue: parsed.data.revenue,
      paymentMethod: parsed.data.paymentMethod,
      notes: parsed.data.notes || "",
      createdAt: new Date().toISOString(),
    };
    await appendWalkinRevenue(entry);
    return NextResponse.json({ success: true, entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to add walk-in", details: message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (!id.startsWith("walk-")) {
      return NextResponse.json(
        { error: "Only walk-in entries can be edited" },
        { status: 400 }
      );
    }
    const parsed = entryBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const updated: RevenueEntry = {
      id,
      date: parsed.data.date,
      source: "walkin",
      groupType: parsed.data.groupType,
      players: parsed.data.players,
      revenue: parsed.data.revenue,
      paymentMethod: parsed.data.paymentMethod,
      notes: parsed.data.notes || "",
      createdAt: typeof body.createdAt === "string" ? body.createdAt : new Date().toISOString(),
    };
    const ok = await updateWalkinRevenue(updated);
    if (!ok) {
      return NextResponse.json({ error: "Walk-in not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update walk-in", details: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !id.startsWith("walk-")) {
      return NextResponse.json(
        { error: "Valid walk-in id is required" },
        { status: 400 }
      );
    }
    const ok = await deleteWalkinRevenue(id);
    if (!ok) {
      return NextResponse.json({ error: "Walk-in not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete walk-in", details: message },
      { status: 500 }
    );
  }
}

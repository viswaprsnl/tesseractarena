import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  listDiscounts,
  appendDiscount,
  updateDiscount,
  deleteDiscount,
} from "@/lib/discount-sheets";
import type { Discount } from "@/lib/discount-config";

const discountBodySchema = z.object({
  label: z.string().min(1).max(80),
  type: z.enum(["percent", "flat"]),
  value: z.number().positive(),
  appliesTo: z.enum(["all", "solo", "squad", "party"]),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  active: z.boolean(),
});

function checkPin(request: NextRequest): boolean {
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get("pin");
  const adminPin = process.env.ADMIN_PIN || "1234";
  return pin === adminPin;
}

export async function GET(request: NextRequest) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const discounts = await listDiscounts();
    return NextResponse.json({ discounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to list discounts", details: message },
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
    const parsed = discountBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    if (parsed.data.startsOn > parsed.data.endsOn) {
      return NextResponse.json(
        { error: "startsOn must be on or before endsOn" },
        { status: 400 }
      );
    }
    if (parsed.data.type === "percent" && parsed.data.value > 100) {
      return NextResponse.json(
        { error: "Percent discount cannot exceed 100" },
        { status: 400 }
      );
    }

    const discount: Discount = {
      id: `disc-${nanoid(6).toLowerCase()}`,
      ...parsed.data,
    };
    await appendDiscount(discount);
    return NextResponse.json({ success: true, discount });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create discount", details: message },
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
    const parsed = discountBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    if (parsed.data.startsOn > parsed.data.endsOn) {
      return NextResponse.json(
        { error: "startsOn must be on or before endsOn" },
        { status: 400 }
      );
    }
    if (parsed.data.type === "percent" && parsed.data.value > 100) {
      return NextResponse.json(
        { error: "Percent discount cannot exceed 100" },
        { status: 400 }
      );
    }
    const ok = await updateDiscount({ id, ...parsed.data });
    if (!ok) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update discount", details: message },
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
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const ok = await deleteDiscount(id);
    if (!ok) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete discount", details: message },
      { status: 500 }
    );
  }
}

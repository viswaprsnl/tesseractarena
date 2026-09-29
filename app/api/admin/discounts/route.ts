import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  listDiscounts,
  appendDiscount,
  updateDiscount,
  deleteDiscount,
} from "@/lib/discount-sheets";
import { normalizeCode, type Discount } from "@/lib/discount-config";

const discountBodySchema = z.object({
  label: z.string().min(1).max(80),
  type: z.enum(["percent", "flat"]),
  value: z.number().positive(),
  appliesTo: z.enum(["all", "solo", "squad", "party"]),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  active: z.boolean(),
  // Optional coupon code. Blank / undefined = auto-apply campaign. When
  // set, only bookings where the customer enters this exact code (case-
  // insensitive) get the discount. Restricted to a small alphanumeric-
  // dash-underscore alphabet so codes are easy to speak on the phone and
  // safe to paste anywhere.
  code: z
    .string()
    .max(24)
    .regex(/^[A-Za-z0-9_-]*$/, "Coupon codes are letters, digits, dashes or underscores only")
    .optional()
    .default(""),
});

// Reject anything blatantly invalid up front so the sheet write can assume
// well-formed input. Called from POST + PATCH.
function extraValidation(body: z.infer<typeof discountBodySchema>): string | null {
  if (body.startsOn > body.endsOn) {
    return "startsOn must be on or before endsOn";
  }
  if (body.type === "percent" && body.value > 100) {
    return "Percent discount cannot exceed 100";
  }
  return null;
}

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
    const extraErr = extraValidation(parsed.data);
    if (extraErr) {
      return NextResponse.json({ error: extraErr }, { status: 400 });
    }
    const code = normalizeCode(parsed.data.code);
    if (code) {
      const existing = await listDiscounts();
      if (existing.some((d) => normalizeCode(d.code) === code)) {
        return NextResponse.json(
          { error: `Coupon code "${code}" is already in use` },
          { status: 409 }
        );
      }
    }

    const discount: Discount = {
      id: `disc-${nanoid(6).toLowerCase()}`,
      ...parsed.data,
      code,
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
    const extraErr = extraValidation(parsed.data);
    if (extraErr) {
      return NextResponse.json({ error: extraErr }, { status: 400 });
    }
    const code = normalizeCode(parsed.data.code);
    if (code) {
      const existing = await listDiscounts();
      // Uniqueness applies across sibling rows only — editing a row and
      // keeping its own code is fine.
      if (existing.some((d) => d.id !== id && normalizeCode(d.code) === code)) {
        return NextResponse.json(
          { error: `Coupon code "${code}" is already in use` },
          { status: 409 }
        );
      }
    }
    const ok = await updateDiscount({ id, ...parsed.data, code });
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

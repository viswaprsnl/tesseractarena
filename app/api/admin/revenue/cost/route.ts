import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listMonthlyCosts, setMonthlyCost } from "@/lib/revenue-sheets";

const costBodySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  cost: z.number().int().min(0).max(100_000_000),
});

// Monthly cost is an owner-side setting — staff shouldn't rewrite it.
function checkPin(request: NextRequest): boolean {
  const pin = new URL(request.url).searchParams.get("pin");
  const ownerPin = process.env.OWNER_PIN;
  if (!ownerPin) return false;
  return pin === ownerPin;
}

export async function GET(request: NextRequest) {
  if (!checkPin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const costs = await listMonthlyCosts();
    return NextResponse.json({ costs });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to list monthly costs", details: message },
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
    const parsed = costBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await setMonthlyCost(parsed.data.month, parsed.data.cost);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to set monthly cost", details: message },
      { status: 500 }
    );
  }
}

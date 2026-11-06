import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listDiscounts } from "@/lib/discount-sheets";
import { normalizeCode } from "@/lib/discount-config";

// Coupon validation endpoint. Customers hit this from the booking flow
// with a code they were handed out-of-band; if it matches an active,
// in-window coupon whose package scope covers their selection, we hand
// back the discount so the client can preview the price + include the
// code in the eventual /api/bookings POST. Codes are never listed in
// bulk anywhere — this is the only way to learn a coupon exists.

const bodySchema = z.object({
  code: z.string().min(1).max(24),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Package scope sent by the client. The Solo/Squad/Party tiers were
  // retired on 2026-11-05; "standard" is the current value for regular
  // per-person bookings. Legacy values still accepted so a stale client
  // doesn't 400 during rollout — they'll just read as a standard booking
  // when matched against coupon scope.
  package: z
    .enum(["standard", "solo", "squad", "party"])
    .default("standard"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }
    const code = normalizeCode(parsed.data.code);
    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const all = await listDiscounts();
    const match = all.find((d) => normalizeCode(d.code) === code);
    if (!match) {
      // Same generic message for "unknown" vs "inactive" so we don't leak
      // the existence of paused / scheduled coupons.
      return NextResponse.json(
        { error: "That coupon isn't valid" },
        { status: 404 }
      );
    }
    if (!match.active) {
      return NextResponse.json(
        { error: "That coupon isn't valid" },
        { status: 404 }
      );
    }
    if (match.startsOn > parsed.data.date || match.endsOn < parsed.data.date) {
      return NextResponse.json(
        { error: "This coupon isn't valid for the selected date" },
        { status: 400 }
      );
    }
    // Normalise any legacy tier value to "standard" for scope comparison —
    // a coupon still scoped to "squad" in the sheet (there shouldn't be
    // any after the admin UI update, but defensive) counts as applying
    // to today's "standard" bookings.
    const effectivePackage: string =
      parsed.data.package === "solo" ||
      parsed.data.package === "squad" ||
      parsed.data.package === "party"
        ? "standard"
        : parsed.data.package;
    if (match.appliesTo !== "all" && match.appliesTo !== effectivePackage) {
      return NextResponse.json(
        {
          error: `This coupon only applies to the ${match.appliesTo} package`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        discount: {
          id: match.id,
          label: match.label,
          type: match.type,
          value: match.value,
          appliesTo: match.appliesTo,
          startsOn: match.startsOn,
          endsOn: match.endsOn,
          active: match.active,
          code: normalizeCode(match.code),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Coupon validation failed:", message);
    return NextResponse.json(
      { error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}

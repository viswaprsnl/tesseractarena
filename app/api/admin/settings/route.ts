import { NextRequest, NextResponse } from "next/server";
import { roleForPin } from "@/lib/admin-auth";
import { z } from "zod";
import {
  getSetting,
  listSettings,
  setAdvanceRequired,
  setHalloweenMode,
  setDiwaliMode,
  SETTING_KEYS,
  getPricing,
  setPricing,
  getOps,
  setOps,
} from "@/lib/settings-sheets";
import { resolvePricing } from "@/lib/pricing";
import { resolveOps } from "@/lib/ops-config";

// Admin-authenticated read + write for app settings. Separate from
// /api/settings (which is public, read-only, and returns only what
// the booking wizard needs). This one returns the full audit shape
// (value, updatedAt, updatedBy) and lets staff toggle flags.
//
// Auth: ADMIN_PIN via ?pin= — same pattern as /api/admin/revenue.

function checkAdminPin(request: NextRequest): boolean {
  return !!roleForPin(new URL(request.url).searchParams.get("pin"));
}

export async function GET(request: NextRequest) {
  if (!checkAdminPin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const all = await listSettings();
    // Also return the resolved "effective" values with defaults
    // applied, so the admin UI doesn't need to re-implement the
    // defaulting logic that lives in lib/settings-sheets.ts.
    const advanceRow = all.find((r) => r.key === SETTING_KEYS.ADVANCE_REQUIRED);
    const halloweenRow = all.find((r) => r.key === SETTING_KEYS.HALLOWEEN_MODE);
    const diwaliRow = all.find((r) => r.key === SETTING_KEYS.DIWALI_MODE);
    const isFalsy = (v: string) => /^(false|0|no|off)$/i.test(v.trim());
    const isTruthy = (v: string) => /^(true|1|yes|on)$/i.test(v.trim());
    return NextResponse.json({
      rows: all,
      resolved: {
        // advance defaults to true (missing row = required)
        advanceRequired: !advanceRow || !isFalsy(advanceRow.value),
        // seasonal overlays default to false (missing row = off)
        halloweenMode: !!halloweenRow && isTruthy(halloweenRow.value),
        diwaliMode: !!diwaliRow && isTruthy(diwaliRow.value),
        pricing: await getPricing(),
        // Staff need food and corporate prices to book events; game fees
        // and the rest stay with the owner.
        ops: await getOps().then((o) =>
          roleForPin(new URL(request.url).searchParams.get("pin")) === "owner"
            ? o
            : { food: o.food, corporatePerHead: o.corporatePerHead }
        ),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to load settings", details: message },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  advanceRequired: z.boolean().optional(),
  halloweenMode: z.boolean().optional(),
  diwaliMode: z.boolean().optional(),
  // Shape is validated (and defaults filled) by resolvePricing.
  pricing: z.record(z.string(), z.unknown()).optional(),
  ops: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(request: NextRequest) {
  if (!checkAdminPin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    // Which PIN level made the change — tracked in updatedBy so the
    // sheet log distinguishes an owner change from a staff change.
    const label = roleForPin(new URL(request.url).searchParams.get("pin")) ?? "staff";

    if ((parsed.data.pricing || parsed.data.ops) && label !== "owner") {
      return NextResponse.json({ error: "Owner PIN required to change prices" }, { status: 403 });
    }
    const updates: string[] = [];
    if (parsed.data.pricing) {
      await setPricing(resolvePricing(parsed.data.pricing), label);
      updates.push(SETTING_KEYS.PRICING);
    }
    if (parsed.data.ops) {
      await setOps(resolveOps(parsed.data.ops), label);
      updates.push(SETTING_KEYS.OPS);
    }
    if (parsed.data.advanceRequired !== undefined) {
      await setAdvanceRequired(parsed.data.advanceRequired, label);
      updates.push(SETTING_KEYS.ADVANCE_REQUIRED);
    }
    if (parsed.data.halloweenMode !== undefined) {
      await setHalloweenMode(parsed.data.halloweenMode, label);
      updates.push(SETTING_KEYS.HALLOWEEN_MODE);
    }
    if (parsed.data.diwaliMode !== undefined) {
      await setDiwaliMode(parsed.data.diwaliMode, label);
      updates.push(SETTING_KEYS.DIWALI_MODE);
    }

    const [advanceRow, halloweenRow, diwaliRow] = await Promise.all([
      getSetting(SETTING_KEYS.ADVANCE_REQUIRED),
      getSetting(SETTING_KEYS.HALLOWEEN_MODE),
      getSetting(SETTING_KEYS.DIWALI_MODE),
    ]);
    return NextResponse.json({
      success: true,
      updated: updates,
      current: {
        advanceRequired:
          !advanceRow || !/^(false|0|no|off)$/i.test(advanceRow.value.trim()),
        halloweenMode:
          !!halloweenRow && /^(true|1|yes|on)$/i.test(halloweenRow.value.trim()),
        diwaliMode:
          !!diwaliRow && /^(true|1|yes|on)$/i.test(diwaliRow.value.trim()),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update settings", details: message },
      { status: 500 }
    );
  }
}

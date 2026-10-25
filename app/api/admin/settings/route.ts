import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSetting,
  listSettings,
  setAdvanceRequired,
  setHalloweenMode,
  SETTING_KEYS,
} from "@/lib/settings-sheets";

// Admin-authenticated read + write for app settings. Separate from
// /api/settings (which is public, read-only, and returns only what
// the booking wizard needs). This one returns the full audit shape
// (value, updatedAt, updatedBy) and lets staff toggle flags.
//
// Auth: ADMIN_PIN via ?pin= — same pattern as /api/admin/revenue.

function checkAdminPin(request: NextRequest): boolean {
  const pin = new URL(request.url).searchParams.get("pin");
  const adminPin = process.env.ADMIN_PIN || "1234";
  const ownerPin = process.env.OWNER_PIN;
  return pin === adminPin || (!!ownerPin && pin === ownerPin);
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
    const isFalsy = (v: string) => /^(false|0|no|off)$/i.test(v.trim());
    const isTruthy = (v: string) => /^(true|1|yes|on)$/i.test(v.trim());
    return NextResponse.json({
      rows: all,
      resolved: {
        // advance defaults to true (missing row = required)
        advanceRequired: !advanceRow || !isFalsy(advanceRow.value),
        // halloween defaults to false (missing row = off)
        halloweenMode: !!halloweenRow && isTruthy(halloweenRow.value),
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
    const pin = new URL(request.url).searchParams.get("pin");
    const label =
      process.env.OWNER_PIN && pin === process.env.OWNER_PIN ? "owner" : "staff";

    const updates: string[] = [];
    if (parsed.data.advanceRequired !== undefined) {
      await setAdvanceRequired(parsed.data.advanceRequired, label);
      updates.push(SETTING_KEYS.ADVANCE_REQUIRED);
    }
    if (parsed.data.halloweenMode !== undefined) {
      await setHalloweenMode(parsed.data.halloweenMode, label);
      updates.push(SETTING_KEYS.HALLOWEEN_MODE);
    }

    const [advanceRow, halloweenRow] = await Promise.all([
      getSetting(SETTING_KEYS.ADVANCE_REQUIRED),
      getSetting(SETTING_KEYS.HALLOWEEN_MODE),
    ]);
    return NextResponse.json({
      success: true,
      updated: updates,
      current: {
        advanceRequired:
          !advanceRow || !/^(false|0|no|off)$/i.test(advanceRow.value.trim()),
        halloweenMode:
          !!halloweenRow && /^(true|1|yes|on)$/i.test(halloweenRow.value.trim()),
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

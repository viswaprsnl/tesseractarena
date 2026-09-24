import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createKioskSession,
  clearKioskSession,
} from "@/lib/kiosk-session";

// POST /api/kiosk/session — trades the staff PIN for a signed cookie
// that every kiosk API and page then trusts for the next 24 hours.
// The pin arrives in the body (not a query string) so it never lands
// in access logs or the browser history. On success the cookie is
// set on the response; no PIN is echoed back.
const loginSchema = z.object({
  pin: z.string().min(1).max(64),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "PIN required" }, { status: 400 });
    }
    const adminPin = process.env.ADMIN_PIN || "1234";
    if (parsed.data.pin !== adminPin) {
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }
    await createKioskSession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}

// DELETE /api/kiosk/session — staff sign-out. Clears the cookie; next
// visit to /kiosk lands back on the PIN screen.
export async function DELETE() {
  await clearKioskSession();
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { roleForPin } from "@/lib/admin-auth";

// POST { pin } → { role: "owner" | "staff" }. Only checks the PIN, so a
// Sheets outage can't make a correct PIN look wrong.
export async function POST(request: NextRequest) {
  const { pin } = await request.json().catch(() => ({}));
  const role = roleForPin(pin);
  if (!role) return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  return NextResponse.json({ role });
}

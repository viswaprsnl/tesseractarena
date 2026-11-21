import { NextRequest, NextResponse } from "next/server";
import { roleForPin } from "@/lib/admin-auth";
import { listBookingRows } from "@/lib/google-sheets";
import { readRows } from "@/lib/sheets";
import { getTodayISTString } from "@/lib/booking-config";
import type { Customer } from "@/lib/booking-types";

// One customer list built from every place we capture people: bookings
// (website, kiosk, walk-in, phone, birthday), signed waivers and callback
// requests. People are matched on the last 10 digits of their phone,
// falling back to email, so the same person across channels is one row.
const phoneKey = (p: string) => p.replace(/\D/g, "").slice(-10);

export async function GET(request: NextRequest) {
  if (!roleForPin(new URL(request.url).searchParams.get("pin"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [rows, waivers, callbacks] = await Promise.all([
      listBookingRows((b) => b.status !== "cancelled"),
      readRows("Waivers!A2:C").catch(() => []),
      readRows("Callbacks!A2:B").catch(() => []),
    ]);
    const today = getTodayISTString();
    const people = new Map<string, Customer>();
    const byEmail = new Map<string, Customer>();

    const find = (phone: string, email: string, name: string) => {
      const key = phoneKey(phone) || email.toLowerCase();
      if (!key) return null;
      let c = people.get(key) ?? (email ? byEmail.get(email.toLowerCase()) : undefined);
      c ??= { name, phone, email, visits: 0, upcoming: 0, spent: 0, lastVisit: "", sources: [], waiver: false, enquiries: 0 };
      people.set(key, c);
      c.name ||= name;
      c.phone ||= phone;
      c.email ||= email;
      if (c.email) byEmail.set(c.email.toLowerCase(), c);
      return c;
    };

    for (const { booking: b } of rows) {
      const c = find(b.phone, b.email, b.name);
      if (!c) continue;
      if (b.date > today) c.upcoming += 1;
      else {
        c.visits += 1;
        if (b.date > c.lastVisit) c.lastVisit = b.date;
      }
      c.spent += b.amountPaid;
      if (!c.sources.includes(b.source)) c.sources.push(b.source);
    }
    for (const [name = "", email = "", phone = ""] of waivers) {
      const c = find(phone, email, name);
      if (c) c.waiver = true;
    }
    for (const [name = "", phone = ""] of callbacks) {
      const c = find(phone, "", name);
      if (c) c.enquiries += 1;
    }

    // One person can sit under both a phone and an email key.
    const customers = [...new Set(people.values())].sort(
      (a, b) => b.lastVisit.localeCompare(a.lastVisit) || b.upcoming - a.upcoming
    );
    return NextResponse.json({ customers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to load customers", details: message }, { status: 500 });
  }
}

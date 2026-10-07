import { redirect } from "next/navigation";
import { verifyKioskSession } from "@/lib/kiosk-session";
import { KioskPayList } from "./KioskPayList";

// Tab-2 dedicated balance-collection screen for the counter.
//
// Flow:
//   - Tablet 1 (/kiosk) stays on waivers as before.
//   - Tablet 2 (/kiosk/pay) shows TODAY's bookings that still owe a
//     balance. Staff taps one → routes to /kiosk/pay/[bookingId]
//     which shows a big customer-facing QR. Customer scans with
//     their phone, pays via Razorpay, kiosk auto-advances to "paid".
//
// Auth: same signed kiosk session cookie as /kiosk. Staff enters the
// PIN once per shift; both tablets stay authed from the same cookie
// (shared browser profile) or each gets its own PIN entry if the
// tablets are different accounts.

export default async function KioskPayIndex() {
  const authed = await verifyKioskSession();
  if (!authed) {
    // No PIN gate on this surface — kiosk.tsx owns that UX. If the
    // staff hasn't PIN'd into /kiosk yet, bounce there so they do it
    // once and come back.
    redirect("/kiosk");
  }
  return <KioskPayList />;
}

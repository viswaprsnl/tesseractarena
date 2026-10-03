import QRCode from "qrcode";
import KioskShell from "./KioskShell";

// Thin server wrapper — generates the walk-in booking QR SVG at request
// time (Next.js caches it as a static asset since /kiosk itself is
// static) and passes it to the client shell that owns the PIN gate,
// roster, and auto-refresh.
//
// The QR encodes the public /book URL so a walk-in customer scans it
// and completes the booking on their own phone, matching Sandbox VR's
// counter pattern: keep typing off the shared tablet.

export default async function KioskPage() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.tesseractarena.com";
  // ?kiosk=1 switches /book into counter mode: pre-selects today's date,
  // hides the Razorpay advance / balance split (the customer is paying
  // at the counter, not online), and routes "Confirm" straight to the
  // pay-at-center booking endpoint.
  const walkInBookingUrl = `${siteUrl}/book?kiosk=1`;
  const walkInQrSvg = await QRCode.toString(walkInBookingUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: {
      dark: "#ffffff",
      light: "#00000000",
    },
  });

  return (
    <KioskShell
      walkInBookingUrl={walkInBookingUrl}
      walkInQrSvg={walkInQrSvg}
    />
  );
}

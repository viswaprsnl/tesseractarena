import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { ChevronLeft } from "lucide-react";
import { verifyKioskSession } from "@/lib/kiosk-session";
import { findBookingById } from "@/lib/google-sheets";
import { formatTimeDisplay, withGST } from "@/lib/booking-config";
import { KioskPayPoll } from "./KioskPayPoll";

// Tab-2 big-QR screen. Server component so the QR is generated as an
// inline SVG at request time (no client QR library) and the customer-
// facing URL is baked into the page without a client fetch.
//
// The QR encodes /book/pay/<bookingId> — the public phone page where
// the customer actually completes the payment. On successful payment
// the sheet row's balanceDue goes to 0; KioskPayPoll polls every few
// seconds and auto-advances this screen to a "paid" state so staff
// doesn't have to manually refresh.

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function KioskPayBookingPage({ params }: PageProps) {
  const authed = await verifyKioskSession();
  if (!authed) redirect("/kiosk");

  const { bookingId } = await params;
  const decoded = decodeURIComponent(bookingId);
  const result = await findBookingById(decoded);

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="glass-card p-8 max-w-md text-center">
          <p className="font-heading text-xl font-bold mb-2">
            Booking not found
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            <span className="font-mono">{decoded}</span> isn&apos;t in
            today&apos;s sheet.
          </p>
          <Link
            href="/kiosk/pay"
            className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
          >
            <ChevronLeft size={14} />
            Back to payments
          </Link>
        </div>
      </div>
    );
  }

  const b = result.booking;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.tesseractarena.com";
  const payUrl = `${siteUrl}/book/pay/${encodeURIComponent(b.bookingId)}`;
  const qrSvg = await QRCode.toString(payUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: {
      dark: "#ffffff",
      light: "#00000000",
    },
  });

  const balanceIncGST = withGST(b.balanceDue);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <Link
          href="/kiosk/pay"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm"
        >
          <ChevronLeft size={16} />
          Back to payments
        </Link>
        <p className="font-mono text-xs text-muted-foreground">
          {b.bookingId}
        </p>
      </div>

      {/* Main — two columns on desktop/tablet, stacked on phone (though
          phone isn't the real target; the kiosk tablet is). */}
      <div className="max-w-4xl mx-auto px-5 py-8 grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
        {/* Left: summary + status */}
        <div className="md:col-span-3">
          <p className="text-xs uppercase tracking-[0.18em] text-primary/80 font-semibold mb-3">
            Balance payment
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">
            {b.name}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {formatTimeDisplay(b.timeSlot)} · {b.partySize} players
          </p>

          <div className="glass-card p-5 mb-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Collect from customer
            </p>
            <p className="text-5xl font-bold text-primary">
              ₹{balanceIncGST.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Incl. 18% GST · Advance of ₹
              {withGST(b.amountPaid).toLocaleString("en-IN")} already collected
            </p>
          </div>

          {/* Poll + auto-advance to "paid" view when balanceDue=0 */}
          <KioskPayPoll bookingId={b.bookingId} />
        </div>

        {/* Right: the big QR */}
        <div className="md:col-span-2 flex flex-col items-center">
          <div className="bg-background border border-primary/30 p-6 rounded-2xl">
            <div
              className="w-56 h-56 sm:w-64 sm:h-64 [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center max-w-[16rem]">
            Point your phone camera at the code — payment opens on your phone.
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-2 text-center font-mono">
            {payUrl}
          </p>
        </div>
      </div>
    </div>
  );
}

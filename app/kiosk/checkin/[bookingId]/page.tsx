import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { ChevronLeft } from "lucide-react";
import { verifyKioskSession } from "@/lib/kiosk-session";
import { findBookingById } from "@/lib/google-sheets";
import { formatTimeDisplay } from "@/lib/booking-config";
import { WaiverProgress } from "./WaiverProgress";

// Kiosk check-in — one booking's QR page. Server component so the QR
// is generated as an inline SVG at request time (no client library,
// no external QR service call). Polling for waiver progress happens
// inside <WaiverProgress /> below.
//
// Auth: verifyKioskSession() (signed cookie set by the PIN unlock on
// /kiosk). If the tab lost its cookie somehow, redirect back to the
// roster so staff can re-enter the PIN — never expose booking data.

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function CheckinPage({ params }: PageProps) {
  const authed = await verifyKioskSession();
  if (!authed) {
    redirect("/kiosk");
  }

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
            The booking ID <span className="font-mono">{decoded}</span> isn&apos;t
            in today&apos;s sheet.
          </p>
          <Link
            href="/kiosk"
            className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
          >
            <ChevronLeft size={14} />
            Back to check-in
          </Link>
        </div>
      </div>
    );
  }

  const booking = result.booking;
  // The QR encodes the public waiver URL pre-filled with the booking
  // id. When guests scan it on their phones they land on the same
  // /waiver page walk-ins use — no separate mobile flow to maintain.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.tesseractarena.com";
  const waiverUrl = `${siteUrl}/waiver?booking=${encodeURIComponent(booking.bookingId)}`;
  const qrSvg = await QRCode.toString(waiverUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: {
      dark: "#ffffff",
      light: "#00000000",
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <Link
          href="/kiosk"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm"
        >
          <ChevronLeft size={16} />
          Back to check-in
        </Link>
        <p className="text-xs text-muted-foreground font-mono">
          {booking.bookingId}
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-8 items-start">
        {/* Left — QR + instruction */}
        <div className="glass-card p-8 flex flex-col items-center text-center">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-1">
            {booking.name}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {formatTimeDisplay(booking.timeSlot)} · {booking.partySize}{" "}
            {booking.partySize === 1 ? "player" : "players"} ·{" "}
            <span className="capitalize">{booking.package}</span>
          </p>

          <div className="rounded-xl bg-black p-6 mb-6">
            <div
              className="w-64 h-64 sm:w-80 sm:h-80"
              // Server-rendered SVG. safe to inject: the string is
              // generated locally by qrcode with no user-controlled markup.
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>

          <p className="font-heading text-lg font-bold mb-1">
            Scan to sign your waiver
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Every player scans this QR from their own phone, fills the
            waiver, and signs. This tab shows progress in real time.
          </p>
        </div>

        {/* Right — waiver progress (client component, polls the API) */}
        <WaiverProgress
          bookingId={booking.bookingId}
          initialSigned={0}
          totalPlayers={booking.partySize}
          gamePreference={booking.gamePreference}
        />
      </div>
    </div>
  );
}

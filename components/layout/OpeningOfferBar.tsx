"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";

// Thin opening-offer announcement strip above the navbar. Shows only
// through the campaign window; after OFFER_ENDS_ON the component
// returns null forever (component is still bundled but renders nothing,
// so no deploy is required at month-end). Dismissible per browser
// session via sessionStorage — a reader who closes it doesn't see it
// again until they open a new tab. That's a lighter touch than
// localStorage which would silence it forever for repeat visitors.

// Hard dates for the October 2026 opening-offer campaign. The actual
// discount comes from the Discounts sheet (admin creates "Opening
// Offer · 25% off · site-wide" with these exact dates); this bar
// just announces it. If the campaign extends, update END_DATE_ISO.
const OFFER_HEADLINE = "Opening Offer · 25% off every booking · October only";
const END_DATE_ISO = "2026-11-01"; // first day the bar should disappear
const DISMISS_KEY = "ta-opening-offer-dismissed-v1";

export function OpeningOfferBar() {
  // Mount check so SSR + hydration don't mismatch (sessionStorage is
  // client-only). We hide the bar on the server and let it fade in
  // after mount only when the campaign window is open AND it wasn't
  // dismissed this session.
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // Private windows throw on sessionStorage access. Just show the
      // bar in that case; dismiss will no-op harmlessly.
    }
  }, []);

  // Hard date check — bar vanishes automatically on Nov 1 even if nobody
  // deploys. toISODate on IST so a visitor from a different timezone
  // sees the end of October based on arena-local time, not theirs.
  const todayIST = new Date().toLocaleString("sv-SE", {
    timeZone: "Asia/Kolkata",
  }).slice(0, 10);
  const shouldShow = mounted && todayIST < END_DATE_ISO && !dismissed;

  // Set a CSS custom property so the Navbar can shift its `top` by
  // whatever height the bar occupies. The variable toggles 0 ↔ 36px
  // based on `shouldShow` so dismissing the bar snaps the nav back
  // flush to the top without a layout thrash.
  useEffect(() => {
    const root = document.documentElement;
    // 40px covers the single-line layout on desktop and small mobile.
    // On narrow phones the pill + CTA wrap to a second line, which bumps
    // real height closer to 68px — using a slightly generous constant
    // avoids the Navbar peeking underneath on wrap.
    root.style.setProperty("--offer-bar-h", shouldShow ? "40px" : "0px");
    return () => {
      root.style.setProperty("--offer-bar-h", "0px");
    };
  }, [shouldShow]);

  if (!shouldShow) return null;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] text-white overflow-hidden"
      // Hand-rolled gradient — Tailwind's gradient tokens don't give
      // enough control over stop positions for the "spotlight" shimmer
      // effect we want. Three-colour sweep (deep violet → bright
      // violet → cyan accent → deep violet) with the bright centre
      // behind the "25% OFF" chip so it visually pops.
      style={{
        background:
          "linear-gradient(90deg, #3B1E7A 0%, #6C3BFF 35%, #8B5CFF 50%, #6C3BFF 65%, #3B1E7A 100%)",
        boxShadow: "0 2px 20px rgba(108, 59, 255, 0.35)",
      }}
    >
      {/* Subtle animated highlight sweep. Looping gradient translation
          catches the eye without being noisy. Scoped to .shimmer so it
          doesn't leak. */}
      <div className="relative max-w-7xl mx-auto px-10 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-center">
        <Sparkles size={14} className="shrink-0 text-yellow-200 drop-shadow" aria-hidden="true" />
        <span className="text-[11px] sm:text-xs font-semibold tracking-[0.15em] uppercase text-white/90">
          Grand Opening
        </span>
        <span className="hidden sm:inline text-white/40" aria-hidden="true">·</span>
        {/* The headline number. Big, bold, pill-wrapped so it reads as
            a stamp, not body text. */}
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white text-primary font-heading text-sm sm:text-base font-black tracking-wide shadow-sm">
          FLAT 25% OFF
        </span>
        <span className="hidden sm:inline text-white/40" aria-hidden="true">·</span>
        <span className="text-[11px] sm:text-xs text-white/90">
          October only
        </span>
        <Link
          href="/book"
          className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 border border-white/30 text-[11px] sm:text-xs font-semibold tracking-wide uppercase transition-colors ml-1"
        >
          Book now
          <span aria-hidden="true">→</span>
        </Link>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

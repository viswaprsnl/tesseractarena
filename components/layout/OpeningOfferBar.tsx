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
    root.style.setProperty("--offer-bar-h", shouldShow ? "36px" : "0px");
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
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-3 flex-wrap text-center">
        <Sparkles size={14} className="shrink-0 opacity-90" aria-hidden="true" />
        <span className="text-xs sm:text-sm font-medium leading-snug">
          {OFFER_HEADLINE}
        </span>
        <Link
          href="/book"
          className="text-xs sm:text-sm font-semibold underline underline-offset-2 hover:no-underline whitespace-nowrap"
        >
          Book now →
        </Link>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

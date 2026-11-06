"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

// Scrolling offer-announcement strip above the navbar. The whole
// marquee is one <Link> so a tap anywhere routes to /book — no
// dismiss button; the campaign is time-boxed via the date window
// below and vanishes on its own when it ends.
//
// This bar only ANNOUNCES the promo; the actual discount applies
// through a row in the Discounts sheet with matching dates and
// code. Current campaign: Diwali 10% off site-wide. Admin should
// have a row in Discounts:
//   label: "Diwali offer", type: "percent", value: 10,
//   appliesTo: "all", startsOn: 2026-11-05, endsOn: 2026-11-15,
//   active: true, code: "" (blank = auto-apply)
//
// If the campaign extends, update END_DATE_ISO AND the sheet row
// end date — they must stay in lockstep.
const END_DATE_ISO = "2026-11-16"; // first day the bar should disappear

// One repeating unit of the marquee. Rendered N times inside the track
// (both for density and so the loop looks seamless when transform
// crosses -50%). Keep the segment short — the eye reads it in one
// pass before the next one slides into view.
function MessageSegment() {
  return (
    <span className="inline-flex items-center gap-3 sm:gap-4 whitespace-nowrap text-white px-6">
      <Sparkles size={14} className="shrink-0 text-amber-200 drop-shadow" aria-hidden="true" />
      <span className="text-[11px] sm:text-xs font-semibold tracking-[0.15em] uppercase text-white/90">
        Happy Diwali
      </span>
      <span className="text-white/40" aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white text-primary font-heading text-sm sm:text-base font-black tracking-wide shadow-sm">
        FLAT 10% OFF
      </span>
      <span className="text-white/40" aria-hidden="true">·</span>
      <span className="text-[11px] sm:text-xs text-white/90">Festive week</span>
      <span className="text-white/40" aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-white underline underline-offset-4 decoration-white/50">
        Book now
        <span aria-hidden="true">→</span>
      </span>
    </span>
  );
}

export function OpeningOfferBar() {
  // Mount gate so SSR + hydration don't mismatch — we only know the
  // real IST date on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Hard date check — bar vanishes automatically on Nov 1 even if
  // nobody deploys. Done in IST so a visitor from a different timezone
  // sees October end at arena-local midnight, not theirs.
  const todayIST = new Date().toLocaleString("sv-SE", {
    timeZone: "Asia/Kolkata",
  }).slice(0, 10);
  const shouldShow = mounted && todayIST < END_DATE_ISO;

  // Shift the Navbar down by the bar's height while it's active. Using
  // a CSS custom property means Navbar's `top-[var(--offer-bar-h,0px)]`
  // snaps straight back to 0 once the campaign ends.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--offer-bar-h", shouldShow ? "40px" : "0px");
    return () => {
      root.style.setProperty("--offer-bar-h", "0px");
    };
  }, [shouldShow]);

  if (!shouldShow) return null;

  // 6 segments means the track is wide enough that translateX(-50%)
  // scrolls past 3 full segments before looping, so there's always
  // content visible on every width.
  const segments = Array.from({ length: 6 });

  return (
    <Link
      href="/book"
      aria-label="Diwali offer — 10% off every booking this festive week. Book now."
      className="fixed top-0 left-0 right-0 z-[60] block overflow-hidden"
      style={{
        // Diwali-themed gradient: deep marigold → saffron → gold →
        // back to marigold. Warmer than the launch bar's violet and
        // reads festive against the dark site chrome.
        background:
          "linear-gradient(90deg, #8B2500 0%, #D97706 30%, #F59E0B 50%, #D97706 70%, #8B2500 100%)",
        boxShadow: "0 2px 20px rgba(217, 119, 6, 0.4)",
      }}
    >
      <div className="relative py-2 sm:py-2.5">
        <div className="flex items-center animate-offer-scroll hover:[animation-play-state:paused] will-change-transform">
          {segments.map((_, i) => (
            <MessageSegment key={i} />
          ))}
        </div>
      </div>
      <style jsx>{`
        /* 30s per full cycle: fast enough to read as a live marquee,
           slow enough that any single segment is readable at a glance.
           translateX(-50%) because we doubled-plus the content so the
           loop restarts invisibly at the midpoint. */
        @keyframes offer-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-offer-scroll {
          animation: offer-scroll 30s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-offer-scroll { animation: none; }
        }
      `}</style>
    </Link>
  );
}

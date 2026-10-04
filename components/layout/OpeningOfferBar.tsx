"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

// Scrolling opening-offer announcement strip above the navbar. The
// whole marquee is one <Link> so a tap anywhere routes to /book — no
// dismiss button; the campaign is time-boxed and vanishes on its own
// at month-end (date check below).

// Hard dates for the October 2026 opening-offer campaign. The actual
// discount comes from the Discounts sheet (admin created "Opening
// Offer · 25% off · site-wide" with these exact dates); this bar
// just announces it. If the campaign extends, update END_DATE_ISO.
const END_DATE_ISO = "2026-11-01"; // first day the bar should disappear

// One repeating unit of the marquee. Rendered N times inside the track
// (both for density and so the loop looks seamless when transform
// crosses -50%). Keep the segment short — the eye reads it in one
// pass before the next one slides into view.
function MessageSegment() {
  return (
    <span className="inline-flex items-center gap-3 sm:gap-4 whitespace-nowrap text-white px-6">
      <Sparkles size={14} className="shrink-0 text-yellow-200 drop-shadow" aria-hidden="true" />
      <span className="text-[11px] sm:text-xs font-semibold tracking-[0.15em] uppercase text-white/90">
        Grand Opening
      </span>
      <span className="text-white/40" aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white text-primary font-heading text-sm sm:text-base font-black tracking-wide shadow-sm">
        FLAT 25% OFF
      </span>
      <span className="text-white/40" aria-hidden="true">·</span>
      <span className="text-[11px] sm:text-xs text-white/90">October only</span>
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
      aria-label="Opening Offer — 25% off every booking in October. Book now."
      className="fixed top-0 left-0 right-0 z-[60] block overflow-hidden"
      style={{
        background:
          "linear-gradient(90deg, #3B1E7A 0%, #6C3BFF 35%, #8B5CFF 50%, #6C3BFF 65%, #3B1E7A 100%)",
        boxShadow: "0 2px 20px rgba(108, 59, 255, 0.35)",
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

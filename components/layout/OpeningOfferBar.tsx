"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useLivePromo, type LivePromo } from "@/lib/use-promo";

// Scrolling offer-announcement strip above the navbar. The whole
// marquee is one <Link> so a tap anywhere routes to /book.
//
// Driven entirely by the Discounts sheet via useLivePromo(): the bar
// shows only while an active, in-window, site-wide auto-apply
// discount exists, and its text comes from that row's label + value.
// To start a campaign add a row in Admin → Discounts; to stop one,
// flip it inactive (or let its end date pass). No code or deploy
// needed either way.

function MessageSegment({ promo }: { promo: LivePromo }) {
  const badge =
    promo.type === "percent"
      ? `FLAT ${promo.value}% OFF`
      : `₹${promo.value.toLocaleString("en-IN")} OFF`;
  return (
    <span className="inline-flex items-center gap-3 sm:gap-4 whitespace-nowrap text-white px-6">
      <Sparkles size={14} className="shrink-0 text-amber-200 drop-shadow" aria-hidden="true" />
      <span className="text-[11px] sm:text-xs font-semibold tracking-[0.15em] uppercase text-white/90">
        {promo.label}
      </span>
      <span className="text-white/40" aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white text-primary font-heading text-sm sm:text-base font-black tracking-wide shadow-sm">
        {badge}
      </span>
      <span className="text-white/40" aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-white underline underline-offset-4 decoration-white/50">
        Book now
        <span aria-hidden="true">→</span>
      </span>
    </span>
  );
}

export function OpeningOfferBar() {
  const promo = useLivePromo();
  const shouldShow = !!promo;

  // Shift the Navbar down by the bar's height while it's active. Using
  // a CSS custom property means Navbar's `top-[var(--offer-bar-h,0px)]`
  // snaps straight back to 0 once the campaign ends or is paused.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--offer-bar-h", shouldShow ? "40px" : "0px");
    return () => {
      root.style.setProperty("--offer-bar-h", "0px");
    };
  }, [shouldShow]);

  if (!promo) return null;

  // 6 segments means the track is wide enough that translateX(-50%)
  // scrolls past 3 full segments before looping, so there's always
  // content visible on every width.
  const segments = Array.from({ length: 6 });

  return (
    <Link
      href="/book"
      aria-label={`${promo.label} — ${
        promo.type === "percent" ? `${promo.value}% off` : `₹${promo.value} off`
      } every booking. Book now.`}
      className="fixed top-0 left-0 right-0 z-[60] block overflow-hidden"
      style={{
        // Warm marigold → saffron → gold gradient, festive against the
        // dark site chrome.
        background:
          "linear-gradient(90deg, #8B2500 0%, #D97706 30%, #F59E0B 50%, #D97706 70%, #8B2500 100%)",
        boxShadow: "0 2px 20px rgba(217, 119, 6, 0.4)",
      }}
    >
      <div className="relative py-2 sm:py-2.5">
        <div className="flex items-center animate-offer-scroll hover:[animation-play-state:paused] will-change-transform">
          {segments.map((_, i) => (
            <MessageSegment key={i} promo={promo} />
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

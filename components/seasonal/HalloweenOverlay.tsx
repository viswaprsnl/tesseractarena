"use client";

import { useEffect, useState } from "react";

// Seasonal decorations layered on top of the site when the admin
// Settings tab flips `halloween_mode` on. Four effects, all pure
// CSS-animated so there's no JS loop and no re-render cost after
// mount:
//
//   1. Hanging ghosts  — 3 (desktop) / 2 (mobile) SVG ghosts dangle
//      from the top edge with a thin string, swinging gently.
//   2. Flying ghost    — one larger ghost drifts across the viewport,
//      left to right, every ~22s. Desktop only; mobile skips it to
//      preserve scroll performance.
//   3. Pumpkins        — bottom-left and bottom-right corner SVGs,
//      lit from within with a subtle flicker.
//   4. Lightning flash — a full-viewport white overlay that briefly
//      blooms every ~18s to mimic distant lightning. mix-blend-mode
//      "screen" so it brightens the page without washing it out.
//
// All elements are `pointer-events: none` and `aria-hidden` so they
// never catch taps or get read by screen readers. The whole overlay
// is `position: fixed inset: 0; z-index: 30` — above base content,
// well below modals (z-50+) and the mobile sticky Continue bar.
//
// Flag source: the overlay fetches /api/settings once on mount and
// checks `halloweenMode`. If the fetch fails or the flag is off, the
// component returns null and ships zero markup. There's no cost to
// having it mounted in SiteChrome year-round.

export function HalloweenOverlay() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEnabled(!!data?.halloweenMode);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      <style>{HALLOWEEN_KEYFRAMES}</style>

      {/* Lightning flash — a full-viewport mix-blend overlay that
          strobes briefly on a long cadence. The animation holds
          black for most of the cycle (opacity 0) and only pulses
          for ~0.4s, so visually it feels like a distant flash
          rather than a strobe. prefers-reduced-motion handling is
          in the <style> block below, so no motion-safe: Tailwind
          prefix is needed (and wouldn't apply to the custom class
          anyway). */}
      <div
        className="absolute inset-0 bg-white halloween-lightning"
        style={{ mixBlendMode: "screen", opacity: 0 }}
      />

      {/* Hanging ghosts — top edge of the viewport. Each has a
          different horizontal position + swing phase so they don't
          move in lockstep. Mobile shows 2; desktop shows 3. */}
      <HangingGhost leftPct={12} delaySec={0} size={44} />
      <HangingGhost leftPct={48} delaySec={1.4} size={52} />
      <HangingGhost
        leftPct={82}
        delaySec={0.8}
        size={40}
        className="hidden sm:block"
      />

      {/* Flying ghost — desktop only. One slow pass every ~22s. */}
      <FlyingGhost />

      {/* Pumpkins — anchored to bottom corners. The right pumpkin
          sits a bit lower so the pair isn't symmetrical. */}
      <Pumpkin cornerRight bottomPx={16} />
      <Pumpkin bottomPx={24} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Hanging ghost — SVG ghost with a string anchored to the top of
// the viewport. The whole element rotates ±8° around its top
// anchor to swing. aspect-fill with CSS clip-path on the stop so
// the string looks continuous.
// ─────────────────────────────────────────────────────────────────
function HangingGhost({
  leftPct,
  delaySec,
  size,
  className = "",
}: {
  leftPct: number;
  delaySec: number;
  size: number;
  className?: string;
}) {
  const stringHeight = 60; // px below the viewport top
  return (
    <div
      className={`absolute top-0 halloween-swing ${className}`}
      style={{
        left: `${leftPct}%`,
        width: size,
        height: size + stringHeight,
        transformOrigin: "50% 0%",
        animationDelay: `${delaySec}s`,
      }}
    >
      {/* The string */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 bg-white/40"
        style={{ width: 1, height: stringHeight }}
      />
      {/* Ghost SVG */}
      <svg
        viewBox="0 0 64 64"
        className="absolute left-1/2 -translate-x-1/2 drop-shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
        style={{ top: stringHeight, width: size, height: size }}
      >
        <path
          d="M32 4 C 18 4, 12 16, 12 28 L 12 54 C 12 56, 14 56, 16 54 L 20 50 C 22 48, 24 48, 26 50 L 30 54 C 32 56, 34 56, 36 54 L 40 50 C 42 48, 44 48, 46 50 L 50 54 C 52 56, 54 56, 54 54 L 54 28 C 54 16, 46 4, 32 4 Z"
          fill="rgba(255,255,255,0.92)"
        />
        <circle cx="24" cy="26" r="3" fill="#1a0b2e" />
        <circle cx="40" cy="26" r="3" fill="#1a0b2e" />
        <ellipse cx="32" cy="36" rx="4" ry="2.5" fill="#1a0b2e" opacity="0.6" />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Flying ghost — a larger translucent ghost that drifts across the
// viewport horizontally every ~22s. Desktop (sm:) only — on phone
// screens a moving element at this scale creates perceptible
// scroll stutter on mid-tier Android.
// ─────────────────────────────────────────────────────────────────
function FlyingGhost() {
  return (
    <div
      className="hidden sm:block absolute halloween-fly"
      style={{ top: "22%", left: 0 }}
    >
      <svg
        viewBox="0 0 100 100"
        width={110}
        height={110}
        className="drop-shadow-[0_8px_24px_rgba(255,255,255,0.12)]"
      >
        <path
          d="M50 8 C 28 8, 20 24, 20 42 L 20 86 C 20 90, 24 90, 28 86 L 34 80 C 37 77, 41 77, 44 80 L 50 86 C 54 90, 58 90, 62 86 L 68 80 C 71 77, 75 77, 78 80 L 84 86 C 88 90, 80 90, 80 86 L 80 42 C 80 24, 72 8, 50 8 Z"
          fill="rgba(255,255,255,0.78)"
        />
        <circle cx="38" cy="40" r="4" fill="#1a0b2e" />
        <circle cx="62" cy="40" r="4" fill="#1a0b2e" />
        <ellipse cx="50" cy="54" rx="6" ry="3" fill="#1a0b2e" opacity="0.55" />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Pumpkin — bottom corner anchor. SVG with inner glow that
// flickers via opacity keyframe. cornerRight flips to the right
// edge; otherwise sticks to the left.
// ─────────────────────────────────────────────────────────────────
function Pumpkin({
  cornerRight = false,
  bottomPx,
}: {
  cornerRight?: boolean;
  bottomPx: number;
}) {
  return (
    <div
      className="absolute"
      style={{
        bottom: bottomPx,
        [cornerRight ? "right" : "left"]: 16,
        width: 72,
        height: 72,
      }}
    >
      <svg viewBox="0 0 80 80" width={72} height={72}>
        {/* Stem */}
        <rect x="36" y="10" width="8" height="12" rx="2" fill="#3f6b1a" />
        {/* Pumpkin body — three overlapping ovals for the ridge look */}
        <ellipse cx="20" cy="48" rx="14" ry="22" fill="#d47217" />
        <ellipse cx="60" cy="48" rx="14" ry="22" fill="#d47217" />
        <ellipse cx="40" cy="50" rx="22" ry="26" fill="#e8821c" />
        {/* Face — triangle eyes + jagged mouth */}
        <polygon points="28,42 34,52 22,52" fill="#fff2a8" opacity="0.95" />
        <polygon points="52,42 58,52 46,52" fill="#fff2a8" opacity="0.95" />
        <path
          d="M24 60 L30 56 L34 60 L38 56 L42 60 L46 56 L50 60 L54 56 L58 60 L54 66 L28 66 Z"
          fill="#fff2a8"
          opacity="0.95"
        />
        {/* Inner glow — a radial gradient (approximated by a soft
            yellow circle) that flickers via CSS keyframe */}
        <circle
          cx="40"
          cy="52"
          r="12"
          fill="#ffd166"
          className="halloween-flicker"
          style={{ mixBlendMode: "screen" }}
        />
      </svg>
    </div>
  );
}

// Keyframes injected via <style> rather than globals.css so the whole
// Halloween feature is self-contained in this one file — removing
// seasonal/HalloweenOverlay.tsx takes the keyframes with it. If any
// of these ever need tuning cross-component, promote them to
// globals.css.
const HALLOWEEN_KEYFRAMES = `
  @keyframes halloween-swing {
    0%, 100% { transform: rotate(-8deg); }
    50% { transform: rotate(8deg); }
  }
  .halloween-swing {
    animation: halloween-swing 3.2s ease-in-out infinite;
  }
  @keyframes halloween-fly {
    0% { transform: translate3d(-15vw, 0, 0); opacity: 0; }
    8% { opacity: 0.9; }
    92% { opacity: 0.9; }
    100% { transform: translate3d(115vw, 0, 0); opacity: 0; }
  }
  .halloween-fly {
    animation: halloween-fly 22s linear infinite;
  }
  @keyframes halloween-flicker {
    0%, 100% { opacity: 0.5; }
    42% { opacity: 0.85; }
    47% { opacity: 0.4; }
    52% { opacity: 0.85; }
  }
  .halloween-flicker {
    animation: halloween-flicker 2.6s ease-in-out infinite;
  }
  @keyframes halloween-lightning {
    0%, 100% { opacity: 0; }
    2% { opacity: 0.55; }
    4% { opacity: 0; }
    6% { opacity: 0.35; }
    8% { opacity: 0; }
  }
  .halloween-lightning {
    animation: halloween-lightning 18s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .halloween-swing,
    .halloween-fly,
    .halloween-flicker,
    .halloween-lightning {
      animation: none !important;
    }
  }
`;

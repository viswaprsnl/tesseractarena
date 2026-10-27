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
//   3. Witch + message — right-to-left broomstick pass with a scary
//      floating banner, every ~28s.
//   4. Pumpkins        — bottom-left and bottom-right corner SVGs,
//      lit from within with a subtle flicker.
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

      {/* Witch on a broomstick with a trailing message. Flies
          right-to-left so she doesn't share a lane with the ghost
          (which goes left-to-right). Visible on all breakpoints
          because the message is the main CTA — hiding it on mobile
          would waste the whole feature. */}
      <WitchWithMessage />

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
// Witch on a broomstick + trailing scary message. The witch SVG
// faces LEFT (she's flying right-to-left), the message trails on
// her right side so it enters the viewport first and gives readers
// a chance to catch the words before she sweeps off-screen. 28s per
// pass with a staggered start so witch and ghost don't ever cross.
// On a 375px phone the whole package is 280px wide which fits
// comfortably without horizontal scroll. The copy intentionally
// uses ellipses + lowercase "haunting" to feel ominous rather than
// shouty.
// ─────────────────────────────────────────────────────────────────
function WitchWithMessage() {
  return (
    <div
      className="absolute halloween-witch-fly"
      style={{ top: "14%", right: 0 }}
    >
      {/* Flex row: message on LEFT (trailing side of a right-to-left
          traveler), witch SVG on RIGHT (leading side). The subtle
          bob is applied to the inner container so transform:translateX
          from the parent animation isn't fighting a Y oscillation on
          the same element. */}
      <div className="flex items-center gap-3 halloween-witch-bob">
        {/* Scary message — orange text with a soft glow + letter
            spacing. Shadow stack creates the "cursed sign" look
            without needing a background image. drop-shadow keeps
            it legible on any hero backdrop behind. */}
        <div
          className="text-right whitespace-nowrap"
          style={{
            fontFamily: "serif",
            textShadow:
              "0 0 12px rgba(255,107,0,0.65), 0 0 2px rgba(0,0,0,0.9)",
          }}
        >
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-orange-300/80 mb-0.5">
            Beware...
          </p>
          <p className="text-sm sm:text-lg font-bold text-orange-100 italic leading-tight">
            A Halloween haunting
            <br />
            is coming to Tesseract Arena
          </p>
        </div>

        {/* Witch SVG — silhouette style for the "scary" vibe. Pointy
            hat with brim, cloak flowing back, broom extending to the
            right. All in near-black with orange rim-light so she
            reads against the dark site background. */}
        <svg
          viewBox="0 0 140 80"
          width={120}
          height={70}
          className="shrink-0 drop-shadow-[0_6px_16px_rgba(255,107,0,0.35)]"
          style={{ transform: "scaleX(-1)" /* face left (direction of travel) */ }}
        >
          {/* Broomstick — long rod extending back */}
          <rect x="10" y="52" width="90" height="3" rx="1.5" fill="#5a3a1a" />
          {/* Broom bristles — fan shape at the back */}
          <path
            d="M100 42 L132 36 L132 68 L100 62 Z"
            fill="#c47524"
          />
          <path
            d="M100 44 L130 40 M100 48 L132 46 M100 52 L132 52 M100 56 L132 58 M100 60 L130 64"
            stroke="#8a4a12"
            strokeWidth="1"
            fill="none"
          />
          {/* Cloak flowing back (dark trailing drape) */}
          <path
            d="M30 32 L60 44 L52 60 L22 56 Z"
            fill="#1a0b2e"
            opacity="0.85"
          />
          {/* Body / head silhouette */}
          <circle cx="55" cy="34" r="10" fill="#1a0b2e" />
          <path
            d="M45 42 Q 50 60, 70 52 L 70 44 Q 60 48, 48 44 Z"
            fill="#1a0b2e"
          />
          {/* Witch hat — triangle + brim */}
          <path
            d="M48 26 L 55 6 L 62 26 Z"
            fill="#1a0b2e"
          />
          <ellipse cx="55" cy="26" rx="12" ry="2" fill="#1a0b2e" />
          {/* Hat buckle — small orange detail for color pop */}
          <rect x="52" y="20" width="6" height="3" fill="#ff9933" rx="0.5" />
          {/* Glowing eye — single pinprick of orange so she reads
              as menacing, not cute */}
          <circle cx="51" cy="34" r="1.2" fill="#ff6b00" />
        </svg>
      </div>
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
  /* Witch flies right-to-left: start just off the right edge,
     drift across, exit left. Delay staggers her against the
     left-to-right ghost so they never cross on screen. */
  @keyframes halloween-witch-fly {
    0% { transform: translate3d(15vw, 0, 0); opacity: 0; }
    7% { opacity: 1; }
    93% { opacity: 1; }
    100% { transform: translate3d(-115vw, 0, 0); opacity: 0; }
  }
  .halloween-witch-fly {
    animation: halloween-witch-fly 28s linear infinite;
    animation-delay: 10s;
  }
  /* Subtle vertical bob on the inner element so the broomstick
     feels alive rather than mechanical. Applied separately from
     the fly transform so they compose cleanly. */
  @keyframes halloween-witch-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .halloween-witch-bob {
    animation: halloween-witch-bob 2.4s ease-in-out infinite;
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
  @media (prefers-reduced-motion: reduce) {
    .halloween-swing,
    .halloween-fly,
    .halloween-flicker,
    .halloween-witch-fly,
    .halloween-witch-bob {
      animation: none !important;
    }
    /* Park the witch mid-flight so the message stays readable for
       users who disabled motion. */
    .halloween-witch-fly {
      transform: translate3d(-10vw, 0, 0);
      opacity: 1;
    }
  }
`;

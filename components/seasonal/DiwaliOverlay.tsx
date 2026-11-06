"use client";

import { useEffect, useState } from "react";

// Seasonal Diwali overlay — mirrors the Halloween overlay pattern
// (self-gated via /api/settings, pure CSS animations, pointer-events:
// none, z-30). Four effects:
//
//   1. Marigold garland — strung across the top of the viewport,
//      each marigold a small orange/yellow radial disc. Gently
//      sways on a slow sine so it reads as decoration, not animation.
//   2. Hanging diyas    — 3 (desktop) / 2 (mobile) oil-lamp lanterns
//      dangle from the garland on thin strings, flames flickering.
//   3. Fireworks        — colourful burst SVGs appear in the upper
//      half of the viewport at staggered intervals. Each burst
//      scales up + fades in ~0.6s, holds for 0.4s, fades out.
//   4. Corner rangoli   — mandala-style radial patterns at both
//      bottom corners with a slow rotating glow.
//
// All elements are pointer-events:none + aria-hidden. The whole
// overlay sits at z-30 — above base content, well below modals
// (z-50+) and the mobile sticky Continue bar.
//
// prefers-reduced-motion: reduce disables every animation but leaves
// the SVGs visible as a static tableau.

export function DiwaliOverlay() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEnabled(!!data?.diwaliMode);
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
      <style>{DIWALI_KEYFRAMES}</style>

      {/* Marigold garland — a horizontal rope of alternating orange
          and yellow flowers strung across the top. Sways on the
          whole-element transform; each flower keeps its shape. */}
      <MarigoldGarland />

      {/* Hanging diyas — oil lamp lanterns dangling from the garland.
          Mobile shows 2; desktop shows 3. */}
      <HangingDiya leftPct={20} delaySec={0} size={46} />
      <HangingDiya leftPct={50} delaySec={1.1} size={54} />
      <HangingDiya
        leftPct={80}
        delaySec={0.6}
        size={42}
        className="hidden sm:block"
      />

      {/* Firework bursts — four bursts at different positions and
          delays so the sky feels alive without the screen ever
          being too busy at once. Desktop gets all four; mobile
          hides two (upper-corner bursts) to keep scroll smooth. */}
      <Firework topPct={18} leftPct={25} delaySec={0} palette="warm" />
      <Firework topPct={28} leftPct={75} delaySec={3.5} palette="cool" />
      <Firework
        topPct={14}
        leftPct={55}
        delaySec={7}
        palette="warm"
        className="hidden sm:block"
      />
      <Firework
        topPct={34}
        leftPct={12}
        delaySec={10.5}
        palette="cool"
        className="hidden sm:block"
      />

      {/* Corner rangoli — bottom-left + bottom-right mandala glows. */}
      <Rangoli cornerRight />
      <Rangoli />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Marigold garland — SVG rope with ~14 alternating flower discs
// hanging from a thin arc. The whole garland sways ±2° so the
// decoration reads as "strung up" rather than painted on.
// ─────────────────────────────────────────────────────────────────
function MarigoldGarland() {
  const flowers = Array.from({ length: 14 });
  return (
    <div
      className="absolute inset-x-0 top-0 diwali-garland-sway"
      style={{ transformOrigin: "50% 0%" }}
    >
      <svg
        viewBox="0 0 1400 90"
        preserveAspectRatio="none"
        className="w-full h-[70px] sm:h-[90px]"
      >
        {/* The rope — a shallow catenary arc from edge to edge */}
        <path
          d="M 0 10 Q 700 60, 1400 10"
          fill="none"
          stroke="#78350f"
          strokeWidth="2"
        />
        {/* Marigolds strung along the rope. Alternating orange and
            yellow with a subtle gold center dot. */}
        {flowers.map((_, i) => {
          const t = i / (flowers.length - 1);
          const x = t * 1400;
          // Match the arc's Y at this t: y = (1-t)²·10 + 2·(1-t)·t·60 + t²·10
          const y = (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 60 + t ** 2 * 10;
          const isOrange = i % 2 === 0;
          const main = isOrange ? "#f97316" : "#fbbf24";
          const shade = isOrange ? "#c2410c" : "#d97706";
          return (
            <g key={i} transform={`translate(${x}, ${y + 16})`}>
              {/* Short string from rope to flower */}
              <line
                x1={0}
                y1={-16}
                x2={0}
                y2={0}
                stroke="#78350f"
                strokeWidth="0.8"
              />
              {/* Outer petals — six overlapping ellipses */}
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <ellipse
                  key={deg}
                  cx={0}
                  cy={0}
                  rx={6}
                  ry={3}
                  fill={shade}
                  transform={`rotate(${deg})`}
                />
              ))}
              {/* Inner disc */}
              <circle cx={0} cy={0} r={5} fill={main} />
              {/* Gold center dot */}
              <circle cx={0} cy={0} r={1.5} fill="#fde047" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Hanging diya — oil lamp dangling from the garland on a thin
// string. The lamp is a shallow terracotta bowl; the flame is a
// teardrop shape with a flickering opacity + scale animation.
// ─────────────────────────────────────────────────────────────────
function HangingDiya({
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
  const stringHeight = 50;
  return (
    <div
      className={`absolute top-0 diwali-swing ${className}`}
      style={{
        left: `${leftPct}%`,
        width: size,
        height: size + stringHeight,
        transformOrigin: "50% 0%",
        animationDelay: `${delaySec}s`,
      }}
    >
      {/* String */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 bg-amber-900/70"
        style={{ width: 1, height: stringHeight }}
      />
      <svg
        viewBox="0 0 64 64"
        className="absolute left-1/2 -translate-x-1/2 drop-shadow-[0_6px_18px_rgba(251,146,60,0.45)]"
        style={{ top: stringHeight, width: size, height: size }}
      >
        {/* Flame glow — a soft radial halo behind the flame */}
        <circle
          cx="32"
          cy="18"
          r="14"
          fill="#fde047"
          opacity="0.35"
          className="diwali-flame-glow"
        />
        {/* Diya bowl — terracotta half-ellipse with a darker rim */}
        <path
          d="M 10 36 Q 32 58, 54 36 L 48 34 Q 32 46, 16 34 Z"
          fill="#9a3412"
        />
        <path d="M 10 36 Q 32 44, 54 36" fill="#c2410c" />
        {/* Wick — short black tick at the centre of the bowl */}
        <rect x="31" y="26" width="2" height="6" fill="#1c1917" />
        {/* Flame — a teardrop + inner lighter core */}
        <g className="diwali-flame">
          <path
            d="M 32 8 Q 26 18, 32 28 Q 38 18, 32 8 Z"
            fill="#f97316"
          />
          <path
            d="M 32 14 Q 29 20, 32 26 Q 35 20, 32 14 Z"
            fill="#fde047"
          />
        </g>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Firework — a radial burst of coloured lines + dots emanating
// from a central point. Two palette variants so bursts don't look
// identical. Each burst appears briefly then fades, on a long
// delay-staggered loop.
// ─────────────────────────────────────────────────────────────────
function Firework({
  topPct,
  leftPct,
  delaySec,
  palette,
  className = "",
}: {
  topPct: number;
  leftPct: number;
  delaySec: number;
  palette: "warm" | "cool";
  className?: string;
}) {
  const colours =
    palette === "warm"
      ? ["#fde047", "#f97316", "#fb7185", "#f59e0b"]
      : ["#a5f3fc", "#c084fc", "#60a5fa", "#86efac"];
  // Twelve radial streaks + twelve outer spark dots.
  const streaks = Array.from({ length: 12 });
  return (
    <div
      className={`absolute diwali-firework ${className}`}
      style={{
        top: `${topPct}%`,
        left: `${leftPct}%`,
        width: 120,
        height: 120,
        transform: "translate(-50%, -50%)",
        animationDelay: `${delaySec}s`,
        opacity: 0,
      }}
    >
      <svg viewBox="0 0 120 120" width={120} height={120}>
        {streaks.map((_, i) => {
          const angle = (i / streaks.length) * 360;
          const colour = colours[i % colours.length];
          return (
            <g key={i} transform={`rotate(${angle} 60 60)`}>
              {/* Streak — a line from mid to outer radius */}
              <line
                x1="60"
                y1="30"
                x2="60"
                y2="10"
                stroke={colour}
                strokeWidth="2"
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 4px ${colour})`,
                }}
              />
              {/* Spark dot at the streak tip */}
              <circle
                cx="60"
                cy="8"
                r="2"
                fill={colour}
                style={{
                  filter: `drop-shadow(0 0 6px ${colour})`,
                }}
              />
            </g>
          );
        })}
        {/* Bright core */}
        <circle
          cx="60"
          cy="60"
          r="3"
          fill="#ffffff"
          style={{ filter: "drop-shadow(0 0 8px #fde047)" }}
        />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Rangoli — bottom corner mandala. A six-fold radial pattern of
// coloured petals with a slow rotation + glow pulse.
// ─────────────────────────────────────────────────────────────────
function Rangoli({ cornerRight = false }: { cornerRight?: boolean }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <div
      className="absolute diwali-rangoli-pulse"
      style={{
        bottom: 12,
        [cornerRight ? "right" : "left"]: 12,
        width: 100,
        height: 100,
      }}
    >
      <div className="diwali-rangoli-spin w-full h-full">
        <svg viewBox="0 0 100 100" width={100} height={100}>
          {/* Outer petal ring */}
          {petals.map((deg) => (
            <ellipse
              key={`o-${deg}`}
              cx={50}
              cy={18}
              rx={6}
              ry={14}
              fill="#f97316"
              opacity="0.7"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
          {/* Inner petal ring — offset by 30° so the two rings
              interlock. Different colour for contrast. */}
          {petals.map((deg) => (
            <ellipse
              key={`i-${deg}`}
              cx={50}
              cy={30}
              rx={5}
              ry={10}
              fill="#fbbf24"
              opacity="0.8"
              transform={`rotate(${deg + 30} 50 50)`}
            />
          ))}
          {/* Center lotus */}
          <circle cx={50} cy={50} r={8} fill="#c026d3" opacity="0.85" />
          <circle cx={50} cy={50} r={4} fill="#fde047" />
          {/* Spark dots around the outer edge */}
          {petals.map((deg) => (
            <circle
              key={`s-${deg}`}
              cx={50}
              cy={6}
              r={1.5}
              fill="#fde047"
              transform={`rotate(${deg + 30} 50 50)`}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

const DIWALI_KEYFRAMES = `
  @keyframes diwali-garland-sway {
    0%, 100% { transform: rotate(-1deg); }
    50% { transform: rotate(1deg); }
  }
  .diwali-garland-sway {
    animation: diwali-garland-sway 8s ease-in-out infinite;
  }
  @keyframes diwali-swing {
    0%, 100% { transform: rotate(-4deg); }
    50% { transform: rotate(4deg); }
  }
  .diwali-swing {
    animation: diwali-swing 4s ease-in-out infinite;
  }
  @keyframes diwali-flame {
    0%, 100% { transform: scaleY(1) scaleX(1); opacity: 1; }
    40% { transform: scaleY(1.08) scaleX(0.95); opacity: 0.9; }
    60% { transform: scaleY(0.96) scaleX(1.04); opacity: 1; }
  }
  .diwali-flame {
    transform-origin: 32px 28px;
    animation: diwali-flame 1.1s ease-in-out infinite;
  }
  @keyframes diwali-flame-glow {
    0%, 100% { opacity: 0.35; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.12); }
  }
  .diwali-flame-glow {
    transform-origin: 32px 18px;
    animation: diwali-flame-glow 2.2s ease-in-out infinite;
  }
  /* Firework — invisible most of the cycle, bursts to full for a
     brief window then fades. 14s cycle so four staggered instances
     keep the sky active without ever being busy. */
  @keyframes diwali-firework {
    0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
    5% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    15% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
    25% { opacity: 0; transform: translate(-50%, -50%) scale(1.15); }
  }
  .diwali-firework {
    animation: diwali-firework 14s ease-out infinite;
  }
  @keyframes diwali-rangoli-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .diwali-rangoli-spin {
    animation: diwali-rangoli-spin 30s linear infinite;
  }
  @keyframes diwali-rangoli-pulse {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(251,146,60,0.35)); }
    50% { filter: drop-shadow(0 0 16px rgba(251,146,60,0.65)); }
  }
  .diwali-rangoli-pulse {
    animation: diwali-rangoli-pulse 3.5s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .diwali-garland-sway,
    .diwali-swing,
    .diwali-flame,
    .diwali-flame-glow,
    .diwali-firework,
    .diwali-rangoli-spin,
    .diwali-rangoli-pulse {
      animation: none !important;
    }
    .diwali-firework {
      opacity: 0.85;
      transform: translate(-50%, -50%) scale(1);
    }
  }
`;

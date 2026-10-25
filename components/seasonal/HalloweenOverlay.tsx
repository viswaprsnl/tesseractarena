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

      {/* Lightning bolt — a visible jagged SVG that appears for
          ~0.4s synchronized with the flash above. Together they
          read as a thunderstrike (bright flash + visible bolt)
          rather than just a generic white pulse. Two bolts at
          different horizontal positions so the storm feels like
          it's happening across the sky rather than in one spot. */}
      <LightningBolt leftPct={28} delaySec={0} />
      <LightningBolt leftPct={72} delaySec={9} className="hidden sm:block" />

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

      {/* Walking skeleton — a full-body SVG skeleton that strolls
          across the bottom third of the viewport. Legs and arms
          alternate on a 0.6s step cycle so the walk reads as a
          proper gait, not a sliding sprite. One instance only; a
          crowd of skeletons would compete with the witch's message
          for attention and dilute both. */}
      <WalkingSkeleton />

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

// ─────────────────────────────────────────────────────────────────
// Lightning bolt — Halloween-styled: a jagged orange-core bolt
// wrapped in a purple occult glow instead of the usual blue-white
// electric look. Flashes briefly in sync with the full-screen
// lightning tint. The core is cursed-pumpkin orange, the outer
// glow is deep witch-purple — reads as supernatural magic
// cracking the sky, not a storm. Two instances with different
// delays make it feel like strikes across the sky rather than a
// single spot.
// ─────────────────────────────────────────────────────────────────
function LightningBolt({
  leftPct,
  delaySec,
  className = "",
}: {
  leftPct: number;
  delaySec: number;
  className?: string;
}) {
  return (
    <div
      className={`absolute top-0 halloween-bolt ${className}`}
      style={{
        left: `${leftPct}%`,
        width: 60,
        height: "45vh",
        animationDelay: `${delaySec}s`,
        opacity: 0,
      }}
    >
      <svg
        viewBox="0 0 60 300"
        preserveAspectRatio="none"
        width={60}
        height="100%"
      >
        {/* Outer purple halo — wider, softer path for the occult
            aura. Stroked, not filled, so the glow reads as a
            halo around the bolt rather than overlapping it. */}
        <path
          d="M30 0 L18 90 L34 90 L22 180 L40 180 L26 300 L46 160 L30 160 L42 70 L30 70 L36 0 Z"
          fill="none"
          stroke="#a855f7"
          strokeWidth="6"
          strokeLinejoin="miter"
          opacity="0.55"
          style={{
            filter:
              "drop-shadow(0 0 12px #7c3aed) drop-shadow(0 0 28px #4c1d95)",
          }}
        />
        {/* Core bolt — cursed-pumpkin orange with its own warm
            glow stacked on top of the purple halo. Two drop-shadow
            layers so the bright core punches out of the purple
            without washing to white. */}
        <path
          d="M30 0 L18 90 L34 90 L22 180 L40 180 L26 300 L46 160 L30 160 L42 70 L30 70 L36 0 Z"
          fill="#ffb24a"
          style={{
            filter:
              "drop-shadow(0 0 6px #ff6b00) drop-shadow(0 0 14px #ff8800)",
          }}
        />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Walking skeleton — full-body SVG that strolls left-to-right
// across the bottom third of the viewport over 30s. The outer
// element handles the horizontal translation + a subtle vertical
// bob (walking gait rhythm). Inside, limbs are grouped so the
// LEFT leg / RIGHT arm swing forward on even beats and the RIGHT
// leg / LEFT arm swing forward on odd beats — the classic alternate
// gait. Each limb rotates around a joint anchor set via SVG
// transform-origin on the group. Keyframes are 0.6s per step cycle
// which matches a brisk human walking cadence.
//
// Why a single skeleton instead of a crowd: the witch's message is
// already the attention anchor; a parade of skeletons would compete
// and dilute both. One is a focal, memorable encounter.
// ─────────────────────────────────────────────────────────────────
function WalkingSkeleton() {
  // Warm off-white reads as "aged bone" rather than plastic.
  // Dark fills inside sockets and between rib pairs give the
  // skeleton perceived depth at small render sizes.
  const BONE = "#f3ede1";
  const BONE_SHADE = "#c9c0a9"; // 1-tone darker for shading knob edges
  const SOCKET = "#0a0510";
  return (
    <div
      className="absolute halloween-skeleton-walk"
      style={{ bottom: "20%", left: 0, opacity: 0 }}
    >
      <div className="halloween-skeleton-bob">
        <svg
          viewBox="0 0 120 260"
          width={96}
          height={208}
          className="drop-shadow-[0_6px_18px_rgba(0,0,0,0.5)]"
        >
          {/* ═════════════ SKULL ═════════════
              Cranium with distinct jaw (mandible) separated by a
              hairline bone line, cheekbones defined by two slight
              inward curves. The jaw hangs just below the cranium
              rather than merging with it — a real skull has a
              visible articulation here. */}
          {/* Cranium */}
          <path
            d="M60 6 C 40 6, 30 22, 30 42 C 30 54, 32 62, 36 68 L 44 70 L 44 74 L 76 74 L 76 70 L 84 68 C 88 62, 90 54, 90 42 C 90 22, 80 6, 60 6 Z"
            fill={BONE}
          />
          {/* Cheekbones — subtle shadow curves under the eyes */}
          <path
            d="M34 46 Q 42 54, 46 48"
            fill="none"
            stroke={BONE_SHADE}
            strokeWidth="1"
          />
          <path
            d="M86 46 Q 78 54, 74 48"
            fill="none"
            stroke={BONE_SHADE}
            strokeWidth="1"
          />
          {/* Eye sockets — deep ovals with the red glow pinprick */}
          <ellipse cx="46" cy="40" rx="6" ry="7.5" fill={SOCKET} />
          <ellipse cx="74" cy="40" rx="6" ry="7.5" fill={SOCKET} />
          <circle cx="46" cy="40" r="1.5" fill="#ff3030" opacity="0.95" />
          <circle cx="74" cy="40" r="1.5" fill="#ff3030" opacity="0.95" />
          {/* Nasal cavity — upside-down heart / inverted triangle */}
          <path d="M60 50 L 55 62 Q 60 65, 65 62 Z" fill={SOCKET} />
          {/* Jaw (mandible) — a separate chunk below the cranium */}
          <path
            d="M44 74 L 44 78 Q 60 90, 76 78 L 76 74 Z"
            fill={BONE}
          />
          {/* Teeth — a row across the jaw */}
          <path
            d="M46 76 L 46 80 M50 76 L 50 80 M54 76 L 54 80 M58 76 L 58 80 M62 76 L 62 80 M66 76 L 66 80 M70 76 L 70 80 M74 76 L 74 80"
            stroke={SOCKET}
            strokeWidth="1.2"
          />

          {/* ═════════════ CERVICAL SPINE ═════════════ */}
          {/* Three stacked vertebrae discs */}
          <circle cx="60" cy="86" r="2.5" fill={BONE} stroke={BONE_SHADE} strokeWidth="0.5" />
          <circle cx="60" cy="91" r="2.5" fill={BONE} stroke={BONE_SHADE} strokeWidth="0.5" />
          <circle cx="60" cy="96" r="2.5" fill={BONE} stroke={BONE_SHADE} strokeWidth="0.5" />

          {/* ═════════════ CLAVICLES ═════════════
              Two curved collarbones that fan down from the neck
              base to the shoulder joint knobs. */}
          <path d="M60 98 Q 42 102, 32 108" fill="none" stroke={BONE} strokeWidth="3" strokeLinecap="round" />
          <path d="M60 98 Q 78 102, 88 108" fill="none" stroke={BONE} strokeWidth="3" strokeLinecap="round" />

          {/* ═════════════ RIBCAGE ═════════════
              Dark negative-space fill behind curved rib pairs so
              the ribs read as curling AROUND the chest, not just
              drawn on top. Six rib pairs connecting to a central
              sternum. */}
          {/* Negative-space thorax shadow */}
          <path
            d="M38 108 Q 60 104, 82 108 L 82 148 Q 60 156, 38 148 Z"
            fill="rgba(10,5,16,0.4)"
          />
          {/* Rib pairs — each is a curved stroke from spine side out,
              with its mirror on the opposite side. Six pairs. */}
          {[112, 120, 128, 136, 144, 152].map((y) => (
            <g key={y}>
              <path d={`M60 ${y} Q 50 ${y + 2}, 38 ${y - 2}`} fill="none" stroke={BONE} strokeWidth="2.2" strokeLinecap="round" />
              <path d={`M60 ${y} Q 70 ${y + 2}, 82 ${y - 2}`} fill="none" stroke={BONE} strokeWidth="2.2" strokeLinecap="round" />
            </g>
          ))}
          {/* Sternum — the breastbone running down the middle */}
          <rect x="58.5" y="108" width="3" height="42" fill={BONE} rx="1" />

          {/* ═════════════ LUMBAR SPINE ═════════════
              Three vertebrae between the ribcage and pelvis so
              the torso doesn't look floating. */}
          <circle cx="60" cy="156" r="2.5" fill={BONE} stroke={BONE_SHADE} strokeWidth="0.5" />
          <circle cx="60" cy="161" r="2.5" fill={BONE} stroke={BONE_SHADE} strokeWidth="0.5" />
          <circle cx="60" cy="166" r="2.5" fill={BONE} stroke={BONE_SHADE} strokeWidth="0.5" />

          {/* ═════════════ PELVIS ═════════════
              Butterfly/mask shape — two iliac wings flaring up and
              out, hip sockets as dark circles where the femurs
              attach, pubic symphysis as a notch at the bottom. */}
          <path
            d="M38 170 Q 36 180, 44 188 L 54 192 L 56 184 Q 60 182, 64 184 L 66 192 L 76 188 Q 84 180, 82 170 Q 60 174, 38 170 Z"
            fill={BONE}
          />
          {/* Hip sockets (acetabula) */}
          <circle cx="46" cy="182" r="3" fill={SOCKET} />
          <circle cx="74" cy="182" r="3" fill={SOCKET} />

          {/* ═════════════ LEFT ARM (viewer's left) ═════════════
              Shoulder knob → humerus (upper arm) → elbow knob →
              radius+ulna (two parallel forearm bones) → wrist →
              hand (palm block + three finger strokes). */}
          <g
            className="halloween-skeleton-arm-l"
            style={{ transformOrigin: "32px 108px" }}
          >
            {/* Shoulder joint knob */}
            <circle cx="32" cy="108" r="4" fill={BONE} stroke={BONE_SHADE} strokeWidth="0.6" />
            {/* Humerus */}
            <path d="M32 112 L 30 138" stroke={BONE} strokeWidth="4.5" strokeLinecap="round" />
            {/* Elbow knob */}
            <circle cx="30" cy="140" r="3.2" fill={BONE} stroke={BONE_SHADE} strokeWidth="0.6" />
            {/* Radius + ulna — two parallel forearm bones */}
            <path d="M28 142 L 26 168" stroke={BONE} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M32 142 L 30 168" stroke={BONE} strokeWidth="2.2" strokeLinecap="round" />
            {/* Wrist knob */}
            <circle cx="28" cy="170" r="2.5" fill={BONE} />
            {/* Hand — palm + 3 finger strokes */}
            <path d="M25 173 Q 24 180, 26 182" stroke={BONE} strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M28 173 Q 28 181, 30 183" stroke={BONE} strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M30 173 Q 32 180, 33 182" stroke={BONE} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>

          {/* ═════════════ RIGHT ARM (viewer's right) ═════════════ */}
          <g
            className="halloween-skeleton-arm-r"
            style={{ transformOrigin: "88px 108px" }}
          >
            <circle cx="88" cy="108" r="4" fill={BONE} stroke={BONE_SHADE} strokeWidth="0.6" />
            <path d="M88 112 L 90 138" stroke={BONE} strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="90" cy="140" r="3.2" fill={BONE} stroke={BONE_SHADE} strokeWidth="0.6" />
            <path d="M88 142 L 90 168" stroke={BONE} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M92 142 L 94 168" stroke={BONE} strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="92" cy="170" r="2.5" fill={BONE} />
            <path d="M89 173 Q 88 180, 90 182" stroke={BONE} strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M92 173 Q 92 181, 94 183" stroke={BONE} strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M95 173 Q 96 180, 97 182" stroke={BONE} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>

          {/* ═════════════ LEFT LEG (viewer's left) ═════════════
              Hip knob → femur (thigh) → knee knob (patella) →
              tibia+fibula (shin pair) → ankle → foot plate. */}
          <g
            className="halloween-skeleton-leg-l"
            style={{ transformOrigin: "46px 184px" }}
          >
            {/* Femur — thick thigh bone */}
            <path d="M46 186 L 42 212" stroke={BONE} strokeWidth="6" strokeLinecap="round" />
            {/* Knee cap (patella) */}
            <circle cx="42" cy="214" r="3.8" fill={BONE} stroke={BONE_SHADE} strokeWidth="0.6" />
            {/* Tibia + fibula */}
            <path d="M40 216 L 38 244" stroke={BONE} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M44 216 L 42 244" stroke={BONE} strokeWidth="2.5" strokeLinecap="round" />
            {/* Ankle */}
            <circle cx="40" cy="246" r="2.8" fill={BONE} />
            {/* Foot — curved profile with heel + toes */}
            <path d="M34 250 Q 32 254, 36 256 L 48 256 L 50 252 L 42 248 Z" fill={BONE} />
          </g>

          {/* ═════════════ RIGHT LEG (viewer's right) ═════════════ */}
          <g
            className="halloween-skeleton-leg-r"
            style={{ transformOrigin: "74px 184px" }}
          >
            <path d="M74 186 L 78 212" stroke={BONE} strokeWidth="6" strokeLinecap="round" />
            <circle cx="78" cy="214" r="3.8" fill={BONE} stroke={BONE_SHADE} strokeWidth="0.6" />
            <path d="M76 216 L 78 244" stroke={BONE} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M80 216 L 82 244" stroke={BONE} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="80" cy="246" r="2.8" fill={BONE} />
            <path d="M72 250 Q 70 254, 74 256 L 86 256 L 88 252 L 80 248 Z" fill={BONE} />
          </g>
        </svg>
      </div>
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
  /* Visible lightning bolt — synced to the white flash. The bolt
     holds invisible for most of the cycle, snaps on bright for
     ~80ms, fades off, and double-strikes briefly a beat later.
     Matches halloween-lightning cadence (18s cycle). */
  @keyframes halloween-bolt {
    0%, 100% { opacity: 0; }
    1.5% { opacity: 1; }
    4% { opacity: 0; }
    5.5% { opacity: 0.8; }
    8% { opacity: 0; }
  }
  .halloween-bolt {
    animation: halloween-bolt 18s ease-in-out infinite;
  }
  /* Walking skeleton — strolls left-to-right across the bottom
     third of the viewport over 30s. The inner wrapper also bobs
     ±4px to mimic the walking gait rise and fall. */
  @keyframes halloween-skeleton-walk {
    0% { transform: translate3d(-15vw, 0, 0); opacity: 0; }
    6% { opacity: 1; }
    94% { opacity: 1; }
    100% { transform: translate3d(115vw, 0, 0); opacity: 0; }
  }
  .halloween-skeleton-walk {
    animation: halloween-skeleton-walk 30s linear infinite;
    animation-delay: 4s;
  }
  @keyframes halloween-skeleton-bob {
    0%, 100% { transform: translateY(0); }
    25% { transform: translateY(-4px); }
    50% { transform: translateY(0); }
    75% { transform: translateY(-4px); }
  }
  .halloween-skeleton-bob {
    animation: halloween-skeleton-bob 0.6s ease-in-out infinite;
  }
  /* Limb swings — classic alternate gait: left leg + right arm
     forward on one beat, right leg + left arm forward on the
     next. 0.6s cycle matches the bob so each foot plants in
     sync with the body dip. ±18° on legs, ±14° on arms.
     SVG transform-origin on the <g> wrappers (set inline) is
     the hip/shoulder joint. */
  @keyframes halloween-skeleton-leg-forward {
    0%, 100% { transform: rotate(-18deg); }
    50% { transform: rotate(18deg); }
  }
  @keyframes halloween-skeleton-leg-back {
    0%, 100% { transform: rotate(18deg); }
    50% { transform: rotate(-18deg); }
  }
  @keyframes halloween-skeleton-arm-forward {
    0%, 100% { transform: rotate(14deg); }
    50% { transform: rotate(-14deg); }
  }
  @keyframes halloween-skeleton-arm-back {
    0%, 100% { transform: rotate(-14deg); }
    50% { transform: rotate(14deg); }
  }
  /* Left leg forward in phase with right arm back, and vice
     versa (humans walk this way — contralateral swing). */
  .halloween-skeleton-leg-l {
    animation: halloween-skeleton-leg-forward 0.6s ease-in-out infinite;
    transform-box: fill-box;
  }
  .halloween-skeleton-leg-r {
    animation: halloween-skeleton-leg-back 0.6s ease-in-out infinite;
    transform-box: fill-box;
  }
  .halloween-skeleton-arm-l {
    animation: halloween-skeleton-arm-back 0.6s ease-in-out infinite;
    transform-box: fill-box;
  }
  .halloween-skeleton-arm-r {
    animation: halloween-skeleton-arm-forward 0.6s ease-in-out infinite;
    transform-box: fill-box;
  }
  @media (prefers-reduced-motion: reduce) {
    .halloween-swing,
    .halloween-fly,
    .halloween-flicker,
    .halloween-lightning,
    .halloween-bolt,
    .halloween-witch-fly,
    .halloween-witch-bob,
    .halloween-skeleton-walk,
    .halloween-skeleton-bob,
    .halloween-skeleton-leg-l,
    .halloween-skeleton-leg-r,
    .halloween-skeleton-arm-l,
    .halloween-skeleton-arm-r {
      animation: none !important;
    }
    /* Park moving elements mid-flight so they stay visible for
       users who disabled motion. The lightning bolt stays hidden —
       a persistent static bolt would look broken, not creepy. */
    .halloween-witch-fly {
      transform: translate3d(-10vw, 0, 0);
      opacity: 1;
    }
    .halloween-skeleton-walk {
      transform: translate3d(30vw, 0, 0);
      opacity: 1;
    }
    .halloween-bolt {
      opacity: 0;
    }
  }
`;

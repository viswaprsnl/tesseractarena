"use client";

// Through-the-lens scrolling strip of real session footage, Totem-
// pattern. Portrait 9:16 tiles slide right-to-left at a slow pace so
// a visitor doesn't need to scroll to see what the arena actually
// looks like in motion. Hover pauses on desktop; prefers-reduced-
// motion stops it entirely.
//
// Content lives in /public/videos/lens-*.mp4. Add more clips here and
// they'll pick up on the next deploy. Videos should be portrait
// (9:16-ish), 10–30s each, under ~5MB, muted / music-less.

interface LensTile {
  src: string;
  label: string;
}

const TILES: LensTile[] = [
  { src: "/videos/lens-a.mp4", label: "In the arena" },
  { src: "/videos/lens-c.mp4", label: "First-timers" },
  { src: "/videos/hero.mp4", label: "Mid-session" },
];

export function ThroughTheLens() {
  if (TILES.length === 0) return null;
  // Doubled list for the seamless loop — the second copy slides in
  // from the right the moment the first copy's duplicate hits the
  // left, so the eye never catches the restart.
  const rowItems = [...TILES, ...TILES];

  return (
    <section
      aria-label="Through the lens — real sessions"
      className="py-12 sm:py-24 overflow-hidden"
    >
      {/* Section header — mirrors Totem's eyebrow + big headline. The
          italic "lens." reads as a signature touch without needing a
          second CTA at the bottom. No "scrolls sideways" prompt: the
          strip auto-plays and that reads as an instruction, not a
          description. */}
      <div className="max-w-7xl mx-auto px-4 mb-8 sm:mb-10">
        <p className="text-xs sm:text-[13px] tracking-[0.18em] font-semibold text-primary/80 uppercase mb-3">
          Uncut. Real sessions.
        </p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
          Through the{" "}
          <span className="gradient-text italic">lens.</span>
        </h2>
      </div>

      {/* Marquee track. Fades out at the edges so tiles don't slam
          against the viewport boundary. Hover pauses on desktop. */}
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
        <div className="flex gap-4 sm:gap-5 whitespace-nowrap animate-lens-scroll hover:[animation-play-state:paused] px-4">
          {rowItems.map((tile, i) => (
            <div
              key={`${tile.src}-${i}`}
              className="relative shrink-0 w-[220px] h-[360px] sm:w-[260px] sm:h-[420px] rounded-2xl overflow-hidden bg-card border border-white/5"
            >
              <video
                src={tile.src}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Dark gradient at top so the label reads cleanly over any
                  frame of the video. */}
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
              <p className="absolute top-3 left-4 text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-white/90 font-medium">
                {tile.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 25s per full cycle = clearly moving on both desktop and
          mobile. Was 90s originally (effectively static) then 40s
          (still too subtle). At 25s the human eye registers "this is
          an active element" within one glance. Scoped so the keyframe
          doesn't leak globally. */}
      <style jsx>{`
        @keyframes lens-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-lens-scroll {
          animation: lens-scroll 25s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-lens-scroll {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}

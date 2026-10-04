"use client";

import { useEffect, useRef } from "react";

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
  // Portrait tiles are 9:16, landscape are 16:9. Both run the same
  // tile height — landscape just takes up ~1.75x the width so the
  // mix reads like a photographer's contact sheet rather than a
  // forced-crop grid.
  orientation?: "portrait" | "landscape";
}

// Ordered portrait → landscape → portrait → ... so the eye gets a
// rhythm as the strip scrolls past. Add more by dropping an mp4 into
// /public/videos and appending an entry here.
const TILES: LensTile[] = [
  { src: "/videos/lens-a.mp4", label: "In the arena", orientation: "portrait" },
  { src: "/videos/lens-e.mp4", label: "Suited up", orientation: "landscape" },
  { src: "/videos/lens-c.mp4", label: "First-timers", orientation: "portrait" },
  { src: "/videos/lens-f.mp4", label: "The reaction", orientation: "portrait" },
  { src: "/videos/hero.mp4", label: "Mid-session", orientation: "portrait" },
  { src: "/videos/lens-g.mp4", label: "In formation", orientation: "landscape" },
  { src: "/videos/lens-d.mp4", label: "On the floor", orientation: "landscape" },
  { src: "/videos/lens-h.mp4", label: "Mission brief", orientation: "landscape" },
  { src: "/videos/lens-b.mp4", label: "The arena", orientation: "landscape" },
  { src: "/videos/lens-i.mp4", label: "The squad", orientation: "landscape" },
  { src: "/videos/lens-k.mp4", label: "Gearing up", orientation: "landscape" },
  { src: "/videos/lens-j.mp4", label: "Walking in", orientation: "landscape" },
  { src: "/videos/lens-l.mp4", label: "Debrief", orientation: "landscape" },
];

export function ThroughTheLens() {
  if (TILES.length === 0) return null;
  // Doubled list for the seamless loop — the second copy slides in
  // from the right the moment the first copy's duplicate hits the
  // left, so the eye never catches the restart.
  const rowItems = [...TILES, ...TILES];

  // Track every <video> so we can (a) imperatively assert .muted=true
  // on mount (React's muted prop sometimes races iOS Safari's autoplay-
  // eligibility check — attribute isn't on the DOM node when WebKit
  // decides whether to permit play, so inline muted autoplay is
  // refused), and (b) feed each one into an IntersectionObserver that
  // only lets visible tiles play. Mobile browsers cap concurrent
  // video decoders (~10-16 on iOS Safari, lower on budget Android),
  // and 26 autoplaying tiles blows that budget so some silently
  // refuse to play. Pausing offscreen ones keeps the active count to
  // whatever's actually visible (~3-5 at any time).
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = trackRef.current;
    if (!root) return;
    const videos = Array.from(root.querySelectorAll<HTMLVideoElement>("video"));

    // Imperative muted + first play attempt. Even for tiles currently
    // offscreen, this primes the browser's autoplay permission so when
    // IntersectionObserver fires later, play() succeeds instantly.
    for (const v of videos) {
      v.muted = true;
      v.setAttribute("muted", "");
      v.playsInline = true;
      void v.play().catch(() => {
        // Not visible yet or decoder budget full — IO will retry.
      });
    }

    // threshold:0 + rootMargin pre-loads tiles a bit before they enter
    // view so visitors don't see a poster frame as the tile slides in.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const v = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            v.muted = true;
            void v.play().catch(() => {});
          } else {
            v.pause();
          }
        }
      },
      { root: null, rootMargin: "0px 200px", threshold: 0 }
    );
    for (const v of videos) io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <section
      aria-label="Inside the arena — real sessions"
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
          Inside the{" "}
          <span className="gradient-text italic">arena.</span>
        </h2>
      </div>

      {/* Marquee track. Fades out at the edges so tiles don't slam
          against the viewport boundary. Hover pauses on desktop. */}
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
        <div ref={trackRef} className="flex gap-4 sm:gap-5 w-max animate-lens-scroll hover:[animation-play-state:paused] px-4">
          {rowItems.map((tile, i) => (
            <div
              key={`${tile.src}-${i}`}
              className={`relative shrink-0 h-[360px] sm:h-[420px] rounded-2xl overflow-hidden bg-card border border-white/5 ${
                tile.orientation === "landscape"
                  ? "w-[380px] sm:w-[460px]"
                  : "w-[220px] sm:w-[260px]"
              }`}
            >
              <video
                src={tile.src}
                // autoPlay stays as a hint, but the real work is done
                // by the useEffect above — React's muted prop can
                // race iOS Safari's autoplay check, so we also set
                // .muted/.play() imperatively after mount.
                autoPlay
                muted
                loop
                playsInline
                // preload="metadata" only — ~10KB per video, 260KB
                // across the strip, so the moov atom is ready when
                // IntersectionObserver fires play(). "auto" would
                // start pulling the whole 1-5MB file for every tile
                // on first paint, which on mobile saturates the
                // connection and stalls everything else.
                preload="metadata"
                disableRemotePlayback
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

      {/* The real speed depends on how far translateX(-50%) actually
          moves. That percentage is of the ELEMENT'S own box, not the
          parent, which is why we set w-max on the flex row above —
          without it the row was constrained to viewport width and
          only moved ~187px per cycle on mobile (looked frozen).
          With w-max the row's own width equals its full content
          (~9000px), so -50% = ~4500px travel. 50s = ~90 px/sec,
          which reads as "clearly scrolling, one tile every ~2.5s"
          on both desktop and mobile viewports. translate3d forces
          GPU compositing so the 13 autoplaying videos on mobile
          don't throttle the animation thread. */}
      <style jsx>{`
        @keyframes lens-scroll {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
        .animate-lens-scroll {
          animation: lens-scroll 50s linear infinite;
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
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

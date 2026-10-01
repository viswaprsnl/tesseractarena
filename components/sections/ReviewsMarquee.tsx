"use client";

import { Star } from "lucide-react";
import { testimonials } from "@/data/testimonials";

// Infinite horizontal marquee of real Google reviews, placed right
// under the hero. Uses CSS-only animation (no framer-motion / JS) so
// it keeps running smoothly even when the hero video is playing. The
// row is rendered TWICE back-to-back and translated by -50%, which is
// the standard trick for a seamless loop with no "snap" at the end.
//
// Hover pauses the scroll on desktop so a reader can finish a quote
// they want to actually read. Touch devices don't pause (no hover),
// which is fine — the scroll is slow enough to be legible.

// Short-form snippet for the pill. We take the first sentence, cap at
// ~90 chars, and strip trailing whitespace — the Testimonials section
// further down still shows the full review for anyone who wants it.
function snippet(content: string): string {
  const firstSentence = content.split(/[.!?]/)[0]?.trim() ?? content.trim();
  const capped = firstSentence.length > 90
    ? firstSentence.slice(0, 87).trimEnd() + "…"
    : firstSentence;
  return capped;
}

export function ReviewsMarquee() {
  if (testimonials.length === 0) return null;

  // Doubled list = seamless loop. Keys include an index because the
  // same testimonial id appears twice by design.
  const rowItems = [...testimonials, ...testimonials];

  return (
    <section
      aria-label="Google reviews"
      className="py-5 border-y border-white/5 bg-card/30 overflow-hidden"
    >
      <div className="relative flex items-center gap-6">
        {/* Static "5.0 on Google" badge pinned to the left so the
            scrolling text has something to anchor against. */}
        <div className="hidden md:flex items-center gap-2 shrink-0 pl-6 lg:pl-10 pr-4 border-r border-white/10">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-xs tracking-[0.2em] font-heading uppercase text-muted-foreground">
            5.0 on Google
          </span>
        </div>

        {/* Marquee track. Fades out at both edges so pills don't visually
            slam against the viewport boundary. */}
        <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex items-center gap-6 whitespace-nowrap animate-review-scroll hover:[animation-play-state:paused]">
            {rowItems.map((t, i) => (
              <div
                key={`${t.id}-${i}`}
                className="flex items-center gap-3 shrink-0 py-1 pr-6"
              >
                <div className="flex items-center gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      size={10}
                      className={
                        s < t.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground"
                      }
                    />
                  ))}
                </div>
                <span className="text-sm text-foreground/90">
                  &ldquo;{snippet(t.content)}&rdquo;
                </span>
                <span className="text-xs text-muted-foreground">
                  — {t.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keyframes defined inline so this component is self-contained
          and the global stylesheet doesn't grow. The 60s duration keeps
          the scroll leisurely enough to read a full snippet at a
          glance. */}
      <style jsx>{`
        @keyframes review-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-review-scroll {
          animation: review-scroll 60s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-review-scroll {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}

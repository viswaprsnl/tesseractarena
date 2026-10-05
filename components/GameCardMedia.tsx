"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

// Netflix-style preview for a game card.
//
// Desktop (hover-capable pointer): poster by default, fades in a muted
//   looping video after a short hover beat so casual pass-throughs
//   don't trigger downloads.
// Touch / no-hover devices (phones, tablets): poster by default, auto-
//   plays the video once the card scrolls into view via Intersection-
//   Observer and pauses when it leaves. Hover events never fire on
//   touch so without this branch the card stays frozen on the poster.
//   Pausing offscreen cards keeps the browser from decoding every clip
//   on the page at once, which is what Totem's site also does.
//
// YouTube URLs are ignored here — those are for the full-page modal
// only. Card previews must be direct .mp4 / .webm so we can play
// them inline.

interface GameCardMediaProps {
  imageSrc: string;
  // One or more candidate video URLs. The first one that's a direct
  // .mp4 / .webm wins; YouTube / Vimeo / anything else is skipped so
  // we never try to shove an iframe embed into a card. Passing a
  // single string still works.
  videoSrc?: string | Array<string | undefined>;
  alt: string;
  imageClassName?: string;
  sizes?: string;
}

// Delay before starting the download-and-play. Matches the "casual
// mouseover" window — long enough to skip cards the user is scrolling
// past, short enough to feel instant once they park on one.
const HOVER_PLAY_DELAY_MS = 350;

function isPlayableVideoUrl(url: string | undefined): url is string {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return clean.endsWith(".mp4") || clean.endsWith(".webm");
}

// Pick the first candidate that is a direct playable file. Anything
// else (YouTube, Vimeo, blank strings) is ignored so an admin-set
// YouTube trailer doesn't block a seed-data MP4 preview.
function pickPlayable(input: GameCardMediaProps["videoSrc"]): string | undefined {
  if (!input) return undefined;
  const list = Array.isArray(input) ? input : [input];
  return list.find(isPlayableVideoUrl);
}

export function GameCardMedia({
  imageSrc,
  videoSrc,
  alt,
  imageClassName,
  sizes,
}: GameCardMediaProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  const resolvedVideoSrc = pickPlayable(videoSrc);
  const canPlay = !!resolvedVideoSrc;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Shared play helper — re-asserts muted on the DOM node (iOS Safari
  // occasionally treats a hydrated element as un-muted for autoplay-
  // eligibility purposes, see Hero.tsx), rewinds, then plays. Falls
  // back to hiding the video layer if autoplay is still refused.
  const playVideo = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    setShowVideo(true);
    el.muted = true;
    void el.play().catch(() => {
      setShowVideo(false);
    });
  }, []);

  const pauseVideo = useCallback(() => {
    const el = videoRef.current;
    if (el) {
      el.pause();
    }
    setShowVideo(false);
  }, []);

  const handleEnter = useCallback(() => {
    if (!canPlay) return;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      const el = videoRef.current;
      if (el) el.currentTime = 0;
      playVideo();
    }, HOVER_PLAY_DELAY_MS);
  }, [canPlay, clearTimer, playVideo]);

  const handleLeave = useCallback(() => {
    clearTimer();
    const el = videoRef.current;
    if (el) el.currentTime = 0;
    pauseVideo();
  }, [clearTimer, pauseVideo]);

  useEffect(() => clearTimer, [clearTimer]);

  // Autoplay-on-scroll path. Fires on EVERY device, not just
  // touch — the hover-to-play handlers above still work as an extra
  // trigger (desktop users who mouse over a card restart its video
  // from the beginning), but we no longer gate the IO on (hover:
  // none) because that left desktop cards stuck on the poster
  // forever when a user simply scrolled past without hovering.
  // Was originally restricted to touch because the hover UX was
  // designed as "poster until hover" on desktop; feedback was that
  // this made the Games Library look static. IO + threshold 0.4
  // keeps the active-decoder count low on both platforms —
  // typically 3-5 videos playing at any time.
  useEffect(() => {
    if (!canPlay) return;
    if (typeof window === "undefined") return;
    const node = rootRef.current;
    if (!node) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            playVideo();
          } else {
            pauseVideo();
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [canPlay, playVideo, pauseVideo]);

  return (
    <div
      ref={rootRef}
      className="absolute inset-0"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className={imageClassName}
        sizes={sizes}
      />
      {canPlay && (
        <video
          ref={videoRef}
          src={resolvedVideoSrc}
          muted
          loop
          playsInline
          // metadata (not none) so the first frame + duration are ready
          // the moment IntersectionObserver fires on mobile — otherwise
          // iOS Safari will drop the first play() while it fetches the
          // moov atom and the card stays on the poster for ~1s.
          preload="metadata"
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 ${
            showVideo ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}

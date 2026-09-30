"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

// Netflix-style hover preview for a game card. Shows the poster image
// by default; on desktop hover, waits a short beat (so casual mouse
// pass-throughs don't kick off downloads) then fades in a muted looping
// video preview. YouTube URLs are ignored here — those are for the
// full-page modal only, where iframe chrome is acceptable. Card
// previews must be direct .mp4 / .webm so we can play them inline.

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

  const handleEnter = useCallback(() => {
    if (!canPlay) return;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setShowVideo(true);
      const el = videoRef.current;
      if (!el) return;
      // Re-assert muted on the DOM node — see Hero.tsx for why iOS
      // Safari occasionally treats a hydrated element as un-muted for
      // autoplay-eligibility purposes.
      el.muted = true;
      el.currentTime = 0;
      void el.play().catch(() => {
        // Autoplay refused — leave the poster visible.
        setShowVideo(false);
      });
    }, HOVER_PLAY_DELAY_MS);
  }, [canPlay, clearTimer]);

  const handleLeave = useCallback(() => {
    clearTimer();
    setShowVideo(false);
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return (
    <div
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
          preload="none"
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 ${
            showVideo ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}

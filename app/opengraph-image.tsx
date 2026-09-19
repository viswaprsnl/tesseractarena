import { ImageResponse } from "next/og";
import { ogCardElement, OG_ALT, OG_SIZE } from "@/lib/og-card";

// Special App Router file convention: Next.js exposes this file at
// /opengraph-image and auto-injects the correct <meta property="og:image">
// on every page that doesn't override it. Returns a 1200×630 PNG (raster,
// what WhatsApp / Facebook / Instagram / LinkedIn actually render — the
// old logo-horizontal.svg failed silently on WhatsApp because none of the
// major messengers preview SVGs).
//
// The route-segment config (`alt`, `size`, `contentType`, `runtime`) MUST
// be declared inline in this file — Next's static parser can't follow a
// re-export. Only the visual JSX is shared with twitter-image via
// lib/og-card.
//
// Placeholder branding for now: dark violet gradient + wordmark + tagline
// + location. Swap for a real 1200×630 arena photo when available; see
// the note at the bottom of this file.

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(ogCardElement(), { ...size });
}

// ─────────────────────────────────────────────────────────────────────────
// Swap to a real arena photo later:
// 1. Save a 1200×630 JPG (well-lit, players in headsets ideally) to
//    public/og-image.jpg
// 2. Delete this file, delete app/twitter-image.tsx
// 3. In app/layout.tsx add:
//      openGraph: { images: ["/og-image.jpg"] }
//      twitter:  { images: ["/og-image.jpg"] }
// The real photo will always beat the generated placeholder for CTR.
// ─────────────────────────────────────────────────────────────────────────

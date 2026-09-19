import { ImageResponse } from "next/og";

// Special App Router file convention: Next.js exposes this file at
// /opengraph-image and auto-injects the correct <meta property="og:image">
// on every page that doesn't override it. Returns a 1200×630 PNG (raster,
// what WhatsApp / Facebook / Instagram / LinkedIn actually render — the
// old logo-horizontal.svg failed silently on WhatsApp because none of the
// major messengers preview SVGs.).
//
// This is placeholder branding: dark violet gradient + wordmark + tagline
// + location. Swap public/og-image.jpg (a real arena photo, 1200×630) in
// once you have one — see the note at the bottom of the file for how to
// switch over.

export const alt =
  "Tesseract Arena — India's First Multi-Title Free-Roam VR Arena";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Force the Node runtime because ImageResponse's font pipeline is more
// reliable under Node than Edge on Vercel for our layout right now.
export const runtime = "nodejs";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0014 0%, #1a0030 50%, #2d0059 100%)",
          padding: "80px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Violet accent glow — top-left */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: -150,
            width: 700,
            height: 700,
            background:
              "radial-gradient(circle, rgba(108, 59, 255, 0.4) 0%, transparent 60%)",
            display: "flex",
          }}
        />
        {/* Pink accent glow — bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: -200,
            right: -150,
            width: 700,
            height: 700,
            background:
              "radial-gradient(circle, rgba(185, 59, 255, 0.35) 0%, transparent 60%)",
            display: "flex",
          }}
        />

        {/* Main content stack */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 1,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: "#b8a3ff",
              letterSpacing: "0.4em",
              marginBottom: 32,
              fontWeight: 600,
              display: "flex",
            }}
          >
            PREMIUM FREE-ROAM VR
          </div>

          <div
            style={{
              fontSize: 108,
              color: "white",
              fontWeight: 900,
              letterSpacing: "0.05em",
              lineHeight: 1,
              display: "flex",
            }}
          >
            TESSERACT
          </div>
          <div
            style={{
              fontSize: 108,
              color: "#b8a3ff",
              fontWeight: 900,
              letterSpacing: "0.15em",
              lineHeight: 1,
              marginTop: -8,
              display: "flex",
            }}
          >
            ARENA
          </div>

          <div
            style={{
              fontSize: 34,
              color: "#e0d5ff",
              marginTop: 48,
              maxWidth: 900,
              lineHeight: 1.3,
              display: "flex",
            }}
          >
            India&apos;s First Multi-Title Free-Roam VR Arena
          </div>

          <div
            style={{
              fontSize: 24,
              color: "#8a7bb8",
              marginTop: 56,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <span>Preston Prime Mall</span>
            <span>·</span>
            <span>Gachibowli, Hyderabad</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
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

// Shared JSX for the OG / Twitter branded card. NOT a route file — the
// Next.js route-segment config exports (runtime, alt, size, contentType)
// have to live in the actual opengraph-image.tsx / twitter-image.tsx
// files (they're parsed at compile time and can't be re-exported).
// Only the visual JSX is centralized here.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT =
  "Tesseract Arena — India's First Multi-Title Free-Roam VR Arena";

export function ogCardElement() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #0a0014 0%, #1a0030 50%, #2d0059 100%)",
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
  );
}

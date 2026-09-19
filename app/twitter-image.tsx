import { ImageResponse } from "next/og";
import { ogCardElement, OG_ALT, OG_SIZE } from "@/lib/og-card";

// Twitter/X's file convention is separate from OpenGraph. We share the
// JSX from lib/og-card so the two previews stay identical, but each
// route-segment config export (`alt`, `size`, `contentType`) has to be
// declared here — Next's compile-time parser can't follow re-exports of
// these fields (verified: the build fails with "runtime field cannot be
// re-exported").

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function TwitterImage() {
  return new ImageResponse(ogCardElement(), { ...size });
}

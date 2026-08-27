import type { MetadataRoute } from "next";

const SITE = "https://www.tesseractarena.com";

// Public pages are open to every crawler; /admin and /api stay out of index.
// Sitemap URL points to the canonical www host so consolidated crawls follow it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}

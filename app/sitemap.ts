import type { MetadataRoute } from "next";

const SITE = "https://www.tesseractarena.com";

// Sitemap covers every public route. /admin, /api, and waiver-with-token URLs
// intentionally excluded — those are not intended for search indexing.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/games", priority: 0.9, changeFrequency: "weekly" },
    { path: "/book", priority: 0.9, changeFrequency: "daily" },
    { path: "/about", priority: 0.7, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/refund", priority: 0.3, changeFrequency: "yearly" },
    { path: "/safety", priority: 0.4, changeFrequency: "yearly" },
  ];

  return routes.map((r) => ({
    url: `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}

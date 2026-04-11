import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "cdn.synthesisvr.com" },
      { hostname: "images.worldofescapes.com" },
      { hostname: "shared.fastly.steamstatic.com" },
      { hostname: "staticctf.ubisoft.com" },
      { hostname: "cdn.akamai.steamstatic.com" },
      { hostname: "images.pexels.com" },
      { hostname: "static.tildacdn.com" },
      { hostname: "inoui-vr.fr" },
    ],
  },
};

export default nextConfig;

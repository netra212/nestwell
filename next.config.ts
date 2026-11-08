import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  htmlLimitedBots: /.*/,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
};
export default nextConfig;

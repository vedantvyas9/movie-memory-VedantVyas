import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Google profile images come from this CDN host — required for next/image to proxy them.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;

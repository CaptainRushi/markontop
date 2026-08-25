import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Section 8: Vercel Edge Network caches the read path (standings) aggressively;
  // webhook writes are the only invalidation. PgBouncer handles connection pooling.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // CDN cache for standings-heavy pages; revalidated on Realtime push
          { key: "CDN-Cache-Control", value: "public, s-maxage=30, stale-while-revalidate=60" },
        ],
      },
    ];
  },
};

export default nextConfig;


import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
        {
        protocol: "https",
        hostname: "xoqybtojklzicwjgncof.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // IPFS (keep if needed)
      { protocol: "https", hostname: "coral-perfect-wildebeest-997.mypinata.cloud", pathname: "/**" },
      { protocol: "https", hostname: "gateway.pinata.cloud", pathname: "/**" },
      { protocol: "https", hostname: "cloudflare-ipfs.com", pathname: "/**" },
      { protocol: "https", hostname: "ipfs.io", pathname: "/**" },
    ],
  },
    async rewrites() {
    return [
      // /mint=CODE  ➜  /mint?code=CODE
{ source: '/mint=:code', destination: '/mint/?code=:code' }
    ];
  },
}


import { NextRequest, NextResponse } from "next/server";

// Prioritize faster gateways - Cloudflare is typically fastest
const PUBLIC_GATEWAYS = [
  "https://cloudflare-ipfs.com",
  "https://w3s.link",
  "https://dweb.link",
  "https://ipfs.io",
  "https://gateway.pinata.cloud", // Keep as last resort due to rate limits
];

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src");
  if (!src) return NextResponse.json({ error: "src required" }, { status: 400 });

  // Accept ipfs://..., https://<gw>/ipfs/<cid>, or bare CID
  const raw = src
    .replace(/^https?:\/\/[^/]+\/ipfs\//, "ipfs://")
    .replace(/^ipfs:\/\//, "");

  for (const gw of PUBLIC_GATEWAYS) {
    const url = `${gw}/ipfs/${raw}`;
    try {
      const upstream = await fetch(url, {
        cache: "no-store",
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(8000), // 8 second timeout per gateway
      });
      if (upstream.ok) {
        const headers = new Headers(upstream.headers);
        // Better caching for images - cache for 1 year, with stale-while-revalidate
        headers.set("Cache-Control", "public, max-age=31536000, immutable, stale-while-revalidate=86400");
        // strip hop-by-hop headers
        headers.delete("transfer-encoding");
        headers.delete("connection");
        return new NextResponse(upstream.body, { status: 200, headers });
      }
    } catch (error) {
      console.log(`IPFS gateway ${gw} failed for ${raw}:`, error);
      // Continue to next gateway
    }
  }
  return NextResponse.json({ error: "All gateways failed" }, { status: 502 });
}

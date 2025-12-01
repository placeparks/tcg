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

  // Extract CID from various formats: ipfs://..., https://<gw>/ipfs/<cid>, or bare CID
  let raw: string;
  let directUrl: string | null = null;
  
  // If it's already a full HTTP URL from a known gateway, try it first
  if (src.startsWith("http://") || src.startsWith("https://")) {
    const urlMatch = src.match(/^https?:\/\/([^/]+)\/ipfs\/(.+)$/);
    if (urlMatch) {
      directUrl = src; // Use the URL directly
      raw = urlMatch[2]; // Extract CID for fallback gateways
    } else {
      // Not an IPFS gateway URL, return as-is
      return NextResponse.json({ error: "Invalid IPFS URL format" }, { status: 400 });
    }
  } else {
    raw = src.replace(/^ipfs:\/\//, "");
  }

  // Try direct URL first if available
  if (directUrl) {
    try {
      const upstream = await fetch(directUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (upstream.ok) {
        const arrayBuffer = await upstream.arrayBuffer();
        const headers = new Headers();
        headers.set("Cache-Control", "public, max-age=31536000, immutable, stale-while-revalidate=86400");
        const contentType = upstream.headers.get("content-type");
        if (contentType) {
          headers.set("content-type", contentType);
        }
        return new NextResponse(arrayBuffer, { status: 200, headers });
      }
    } catch (error) {
      console.log(`Direct URL ${directUrl} failed:`, error);
      // Fall through to try other gateways
    }
  }

  // Try other gateways as fallback
  for (const gw of PUBLIC_GATEWAYS) {
    const url = `${gw}/ipfs/${raw}`;
    try {
      const upstream = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (upstream.ok) {
        const arrayBuffer = await upstream.arrayBuffer();
        const headers = new Headers();
        headers.set("Cache-Control", "public, max-age=31536000, immutable, stale-while-revalidate=86400");
        const contentType = upstream.headers.get("content-type");
        if (contentType) {
          headers.set("content-type", contentType);
        }
        return new NextResponse(arrayBuffer, { status: 200, headers });
      }
    } catch (error) {
      console.log(`IPFS gateway ${gw} failed for ${raw}:`, error);
      // Continue to next gateway
    }
  }
  return NextResponse.json({ error: "All gateways failed" }, { status: 502 });
}

import { NextRequest, NextResponse } from "next/server";

// Prioritize faster gateways - Cloudflare is typically fastest
const PUBLIC_GATEWAYS = [
  "https://cloudflare-ipfs.com",
  "https://w3s.link",
  "https://dweb.link",
  "https://ipfs.io",
  "https://gateway.pinata.cloud", // Keep as last resort due to rate limits
];

const TIMEOUT_MS = 10000; // Increased timeout to 10 seconds

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
      // Not an IPFS gateway URL, but might be a direct image URL - try to return it
      if (src.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|jfif)$/i)) {
        try {
          const response = await fetch(src, {
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const headers = new Headers();
            headers.set("Cache-Control", "public, max-age=31536000, immutable, stale-while-revalidate=86400");
            const contentType = response.headers.get("content-type");
            if (contentType) {
              headers.set("content-type", contentType);
            }
            return new NextResponse(arrayBuffer, { status: 200, headers });
          }
        } catch (error) {
          console.log(`Direct image URL ${src} failed:`, error);
        }
      }
      return NextResponse.json({ error: "Invalid IPFS URL format" }, { status: 400 });
    }
  } else {
    raw = src.replace(/^ipfs:\/\//, "");
  }

  // Try direct URL first if available
  if (directUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      const upstream = await fetch(directUrl, {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });
      clearTimeout(timeoutId);
      
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
    } catch (error: any) {
      console.log(`Direct URL ${directUrl} failed:`, error?.message || error);
      // Fall through to try other gateways
    }
  }

  // Try other gateways as fallback
  for (const gw of PUBLIC_GATEWAYS) {
    const url = `${gw}/ipfs/${raw}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      const upstream = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });
      clearTimeout(timeoutId);
      
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
    } catch (error: any) {
      console.log(`IPFS gateway ${gw} failed for ${raw}:`, error?.message || error);
      // Continue to next gateway
    }
  }
  
  console.error(`All IPFS gateways failed for: ${raw || directUrl}`);
  
  // Return a proper error response that the frontend can handle
  return NextResponse.json({ 
    error: "All gateways failed", 
    cid: raw || directUrl,
    message: "Unable to fetch image from IPFS gateways. The content may not be available or gateways are temporarily unavailable."
  }, { status: 502 });
}

import { NextRequest, NextResponse } from "next/server";

// Prioritize faster gateways - Cloudflare is typically fastest
const PUBLIC_GATEWAYS = [
  "https://cloudflare-ipfs.com",
  "https://w3s.link",
  "https://dweb.link",
  "https://ipfs.io",
  "https://gateway.pinata.cloud", // Keep as last resort due to rate limits
];

/** ERC-1155 requires 64-lowercase-hex token id with no 0x */
function to1155HexId(id: bigint | number | string): string {
  const n = typeof id === "bigint" ? id : BigInt(id);
  return n.toString(16).padStart(64, "0");
}

/** Expand common ERC-1155 URI templates */
function expand1155Uri(uri: string, tokenId: bigint | number = 0n): string {
  if (!uri) return uri;
  const hexId = to1155HexId(tokenId);
  return uri
    .replace("{id}.json", `${hexId}.json`)
    .replace("{id}", hexId);
}

function ipfsToHttp(cidOrPath: string, gateway = PUBLIC_GATEWAYS[0]): string {
  const path = cidOrPath.startsWith("ipfs://")
    ? cidOrPath.slice("ipfs://".length)
    : cidOrPath;
  return `${gateway}/ipfs/${path.replace(/^ipfs\//, "")}`;
}

/** Probe with a tiny GET Range instead of HEAD */
async function probeUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-1" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") || "";
    return ct.includes("image/") || ct.includes("application/json");
  } catch {
    return false;
  }
}

/** Try multiple gateways until one works */
async function firstWorkingUrl(path: string): Promise<string | null> {
  for (const gw of PUBLIC_GATEWAYS) {
    const url = ipfsToHttp(path, gw);
    if (await probeUrl(url)) return url;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src");
  const tokenIdParam = req.nextUrl.searchParams.get("tokenId");
  
  if (!src) {
    return NextResponse.json({ error: "src required" }, { status: 400 });
  }

  const tokenId = tokenIdParam ? BigInt(tokenIdParam) : 0n;

  try {
    console.log("🔍 IPFS Metadata API called:", { src, tokenId: tokenId.toString() });
    
    // 1) If it's ERC-1155 template, expand {id}
    let expanded = expand1155Uri(src, tokenId);
    console.log("🔍 Expanded URI:", expanded);

    // 2) If it's IPFS, move to an HTTP url
    const looksIpfs = expanded.startsWith("ipfs://");
    let httpUrl = looksIpfs ? ipfsToHttp(expanded) : expanded;
    console.log("🔍 HTTP URL:", httpUrl);

    // 3) If it's obviously a metadata (.json or folder), fetch json and pull "image"
    const isJson = httpUrl.endsWith(".json");
    const looksFolder = /\/$/.test(httpUrl) || /\/metadata\/?$/.test(httpUrl);
    console.log("🔍 URL analysis:", { isJson, looksFolder, looksIpfs });

    if (isJson || looksFolder) {
      // If folder, guess a metadata file (common patterns)
      if (looksFolder) {
        const candidates = [
          httpUrl + to1155HexId(tokenId) + ".json",
          httpUrl + "0.json",
          httpUrl.replace(/\/$/, "") + ".json",
          httpUrl + "metadata.json",
        ];
        console.log("🔍 Trying metadata candidates:", candidates);
        for (const c of candidates) {
          try {
            const res = await fetch(c, {
              cache: "no-store",
              signal: AbortSignal.timeout(8000),
            });
            if (res.ok) {
              console.log("✅ Found metadata file:", c);
              httpUrl = c;
              break;
            }
          } catch (error) {
            console.log("❌ Failed to fetch candidate:", c, error);
            // Continue to next candidate
          }
        }
      }

      // Fetch metadata JSON and extract image
      try {
        console.log("🔍 Fetching metadata from:", httpUrl);
        const res = await fetch(httpUrl, {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const meta = await res.json();
          console.log("🔍 Metadata received:", { hasImage: !!meta?.image, keys: Object.keys(meta || {}) });
          let img = meta?.image || meta?.image_url || meta?.imageURI;
          if (typeof img === "string") {
            console.log("🔍 Image URL from metadata:", img);
            // Some metadata put ipfs://, some put bare CID, normalize
            if (img.startsWith("ipfs://") || /^[a-zA-Z0-9]+$/.test(img)) {
              const path = img.startsWith("ipfs://") ? img.slice(7) : img;
              const working = await firstWorkingUrl(path);
              if (working) {
                console.log("✅ Resolved image from metadata:", working);
                return NextResponse.json({ imageUrl: working });
              }
            }
            console.log("✅ Using image URL directly:", img);
            return NextResponse.json({ imageUrl: img });
          } else {
            console.log("⚠️ No image found in metadata JSON");
          }
        } else {
          console.log("⚠️ Metadata fetch failed:", res.status, res.statusText);
        }
      } catch (error) {
        console.log("❌ Error fetching metadata:", error);
        // Fall through to folder image search
      }

      // If folder and we didn't find metadata, try common image filenames
      if (looksFolder) {
        // Reset base to original folder URL (in case httpUrl was changed to a metadata file)
        const base = (looksIpfs ? ipfsToHttp(expanded) : expanded).endsWith("/") 
          ? (looksIpfs ? ipfsToHttp(expanded) : expanded)
          : (looksIpfs ? ipfsToHttp(expanded) : expanded) + "/";
        const hexId = to1155HexId(tokenId);
        const decId = typeof tokenId === "bigint" ? Number(tokenId) : Number(tokenId);
        const candidates = [
          `${hexId}.png`, `${hexId}.jpg`, `${hexId}.jpeg`, `${hexId}.webp`,
          `${decId}.png`, `${decId}.jpg`, `${decId}.jpeg`, `${decId}.webp`,
          `0.png`, `0.jpg`, `0.jpeg`, `0.webp`,
          `cover.png`, `cover.jpg`, `cover.webp`,
          `preview.png`, `preview.jpg`, `preview.webp`,
          `image.png`, `image.jpg`, `image.webp`,
          `logo.png`, `logo.jpg`, `logo.webp`,
          `banner.png`, `banner.jpg`, `banner.webp`,
        ];
        console.log("🔍 Trying image file candidates in folder:", base, candidates.length);
        for (const file of candidates) {
          const url = base + file;
          if (await probeUrl(url)) {
            console.log("✅ Found image file:", url);
            return NextResponse.json({ imageUrl: url });
          }
        }
        console.log("⚠️ No image files found in folder");
      }
    }

    // 4) Otherwise, it might already be the image (either ipfs path or http url)
    if (looksIpfs) {
      const path = expanded.slice(7);
      const working = await firstWorkingUrl(path);
      if (working) {
        return NextResponse.json({ imageUrl: working });
      }
      return NextResponse.json({ imageUrl: ipfsToHttp(path) });
    }

    // Final fallback - return the URL as-is (might be an image or might need further processing)
    console.log("⚠️ No image found, returning HTTP URL as fallback:", httpUrl);
    return NextResponse.json({ imageUrl: httpUrl });
  } catch (error) {
    console.error("❌ Failed to resolve IPFS metadata:", error);
    return NextResponse.json(
      { error: "Failed to resolve metadata", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


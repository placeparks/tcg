// lib/ipfs.ts
const PUBLIC_GATEWAYS = [
  "https://ipfs.io",
  "https://cloudflare-ipfs.com",
  "https://gateway.pinata.cloud",
  "https://dweb.link",
];

export function ipfsToHttp(cidOrPath: string, gateway = PUBLIC_GATEWAYS[0]) {
  // Accept "ipfs://<path>" or raw CID/path
  const path = cidOrPath.startsWith("ipfs://")
    ? cidOrPath.slice("ipfs://".length)
    : cidOrPath;
  return `${gateway}/ipfs/${path.replace(/^ipfs\//, "")}`;
}

/** ERC-1155 requires 64-lowercase-hex token id with no 0x */
export function to1155HexId(id: bigint | number | string) {
  const n = typeof id === "bigint" ? id : BigInt(id);
  return n.toString(16).padStart(64, "0");
}

/** Expand common ERC-1155 URI templates */
export function expand1155Uri(uri: string, tokenId: bigint | number = 0n) {
  if (!uri) return uri;
  const hexId = to1155HexId(tokenId);
  return uri
    .replace("{id}.json", `${hexId}.json`)
    .replace("{id}", hexId);
}

/** Probe with a tiny GET Range instead of HEAD to avoid "works on HEAD, fails on GET" flakiness */
async function probeUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-1" }, // fetch 1st byte only
      cache: "no-store",
    });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") || "";
    // Accept images or JSON (metadata). We'll resolve images later if JSON.
    return ct.includes("image/") || ct.includes("application/json");
  } catch {
    return false;
  }
}

/** Try multiple gateways until one works (GET Range), return first OK url */
export async function firstWorkingUrl(path: string): Promise<string | null> {
  for (const gw of PUBLIC_GATEWAYS) {
    const url = ipfsToHttp(path, gw);
    if (await probeUrl(url)) return url;
  }
  return null;
}

/** Resolve a displayable image URL from a possibly-messy input (template/folder/json) */
export async function resolveDisplayImageUrl(rawUri: string, tokenId: bigint | number = 0n) {
  if (!rawUri) return null;

  // 1) If it's ERC-1155 template, expand {id}
  let expanded = expand1155Uri(rawUri, tokenId);

  // 2) If it's IPFS, move to an HTTP url (we'll still rotate gateways later)
  const looksIpfs = expanded.startsWith("ipfs://");
  let httpUrl = looksIpfs ? ipfsToHttp(expanded) : expanded;

  // 3) If it's obviously a metadata (.json or folder), fetch json and pull "image"
  const isJson = httpUrl.endsWith(".json");
  const looksFolder = /\/$/.test(httpUrl) || /\/metadata\/?$/.test(httpUrl);

  if (isJson || looksFolder) {
    // If folder, guess a metadata file (common patterns)
    if (looksFolder) {
      // Try {id}.json then 0.json then metadata.json
      const candidates = [
        httpUrl + to1155HexId(tokenId) + ".json",
        httpUrl + "0.json",
        httpUrl.replace(/\/$/, "") + ".json",
        httpUrl + "metadata.json",
      ];
      for (const c of candidates) {
        try {
          const res = await fetch(c, { cache: "no-store" });
          if (res.ok) {
            httpUrl = c;
            break;
          }
        } catch (_) { /* keep trying */ }
      }
    }

    // Fetch metadata JSON and extract image
    try {
      const res = await fetch(httpUrl, { cache: "no-store" });
      if (res.ok) {
        const meta = await res.json();
        let img = meta?.image || meta?.image_url || meta?.imageURI;
        if (typeof img === "string") {
          // Some metadata put ipfs://, some put bare CID, normalize
          if (img.startsWith("ipfs://") || /^[a-zA-Z0-9]+$/.test(img)) {
            const path = img.startsWith("ipfs://") ? img.slice(7) : img;
            const working = await firstWorkingUrl(path);
            if (working) return working;
          }
          return img; // already http(s)
        }
      }
    } catch (_) { /* fallthrough */ }
  }

  // 4) Otherwise, it might already be the image (either ipfs path or http url).
  if (looksIpfs) {
    const path = expanded.slice(7);
    const working = await firstWorkingUrl(path);
    if (working) return working;
    return ipfsToHttp(path); // last attempt
  }

  return httpUrl;
}

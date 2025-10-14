import { NextRequest, NextResponse } from "next/server";

const PUBLIC_GATEWAYS = [
  "https://ipfs.io",
  "https://cloudflare-ipfs.com",
  "https://gateway.pinata.cloud",
  "https://dweb.link",
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
      const upstream = await fetch(url, { cache: "no-store" });
      if (upstream.ok) {
        const headers = new Headers(upstream.headers);
        headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
        // strip hop-by-hop headers
        headers.delete("transfer-encoding");
        return new NextResponse(upstream.body, { status: 200, headers });
      }
    } catch { /* try next gateway */ }
  }
  return NextResponse.json({ error: "All gateways failed" }, { status: 502 });
}

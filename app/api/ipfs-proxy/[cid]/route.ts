import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params;
  
  if (!cid) {
    return NextResponse.json({ error: 'Missing CID parameter' }, { status: 400 });
  }

  // List of IPFS gateways to try in order (avoid Pinata - 429 rate limits)
  const gateways = [
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://w3s.link/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`,
  ];

  // Try each gateway until one succeeds
  for (const url of gateways) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NFT-Gallery/1.0',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const content = await response.arrayBuffer();
        
        return new NextResponse(content, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } catch (error) {
      console.log(`Gateway ${url} failed:`, error);
      // Continue to next gateway
    }
  }

  // All gateways failed
  return NextResponse.json(
    { error: 'Failed to fetch from all IPFS gateways' },
    { status: 502 }
  );
}

// lib/alchemy.ts

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
const CHAIN = "base-sepolia";

// Accept either object or string for metadata.image, and include more image keys
export type Maybe<T> = T | null | undefined;

export interface AlchemyImageObj {
  cachedUrl?: Maybe<string>;
  originalUrl?: Maybe<string>;
  thumbnailUrl?: Maybe<string>;
  pngUrl?: Maybe<string>;
  contentType?: Maybe<string>;
  size?: Maybe<number>;
}

export interface AlchemyNFTMetadata {
  image?: Maybe<string | AlchemyImageObj>;
  name?: Maybe<string>;
  description?: Maybe<string>;
  attributes?: Array<{ trait_type?: string; value?: string }>;
  tokenUri?: { raw?: Maybe<string>; gateway?: Maybe<string> } | Maybe<string>;
  // Some collections put the image under other keys too:
  image_url?: Maybe<string>;
  imageUri?: Maybe<string>;
  imageUrl?: Maybe<string>;
  media?: Array<{ gateway?: string; raw?: string }>;
}

export interface AlchemyNFT {
  contract: { address: string; name?: string; symbol?: string; tokenType?: string };
  tokenId: string;
  tokenType?: string;
  name?: Maybe<string>;
  description?: Maybe<string>;
  balance?: Maybe<string>;
  // Alchemy v3 "image" often null; keep it loose:
  image?: Maybe<AlchemyImageObj>;
  // What Alchemy actually gives you back on v3:
  raw?: {
    metadata?: Maybe<AlchemyNFTMetadata>;
    tokenUri?: Maybe<string | { raw?: string; gateway?: string }>;
    error?: Maybe<string>;
  };
  // Some SDKs include a top-level tokenUri too
  tokenUri?: Maybe<string | { raw?: string; gateway?: string }>;
  media?: Array<{ gateway?: string; raw?: string }>;
  // Custom property for unique identification
  uniqueId?: string;
}

const GATEWAYS = [
  "https://cloudflare-ipfs.com/ipfs/",
  "https://w3s.link/ipfs/",
  "https://ipfs.io/ipfs/",
  // Avoid pinata by default (429)
  // "https://gateway.pinata.cloud/ipfs/"
];

function isHttp(u?: Maybe<string>) {
  return typeof u === "string" && /^https?:\/\//i.test(u);
}
function isIpfs(u?: Maybe<string>) {
  return typeof u === "string" && /^ipfs:\/\//i.test(u);
}
function toHttpFromIpfs(ipfsUrl: string, gateway = GATEWAYS[0]) {
  const cidAndPath = ipfsUrl.replace(/^ipfs:\/\//i, "");
  return `${gateway}${cidAndPath}`;
}
function normalizeUrl(u?: Maybe<string>) {
  if (!u) return undefined;
  if (isHttp(u)) return u;
  if (isIpfs(u)) return toHttpFromIpfs(u);
  // Sometimes you get bare "CID[/path]":
  if (/^[a-z0-9]{46,}($|\/)/i.test(u)) return `${GATEWAYS[0]}${u}`;
  return undefined;
}

/**
 * Build a prioritized list of possible image URLs and return the first that looks valid.
 */
export function getBestImageUrl(nft: AlchemyNFT): string | null {
  const c: string[] = [];

  // 1) Alchemy-prepared image fields
  const img = nft.image;
  if (img?.cachedUrl) c.push(img.cachedUrl);
  if (img?.thumbnailUrl) c.push(img.thumbnailUrl);
  if (img?.pngUrl) c.push(img.pngUrl);
  if (img?.originalUrl) c.push(img.originalUrl);

  // 2) Alchemy media array (often present when image.* is null)
  nft.media?.forEach(m => {
    if (m.gateway) c.push(m.gateway);
    if (m.raw) c.push(m.raw);
  });

  // 3) raw.metadata.image can be STRING or OBJECT — handle both
  const md = nft.raw?.metadata;
  const mdImg = md?.image;
  if (typeof mdImg === "string") c.push(mdImg);
  if (mdImg && typeof mdImg === "object") {
    const o = mdImg as AlchemyImageObj;
    if (o.cachedUrl) c.push(o.cachedUrl);
    if (o.originalUrl) c.push(o.originalUrl);
    if (o.thumbnailUrl) c.push(o.thumbnailUrl);
    if (o.pngUrl) c.push(o.pngUrl);
  }

  // 3b) Common alternate keys people use
  if (typeof md?.image_url === "string") c.push(md.image_url);
  if (typeof md?.imageUrl === "string") c.push(md.imageUrl);
  if (typeof md?.imageUri === "string") c.push(md.imageUri);
  md?.media?.forEach(m => {
    if (m.gateway) c.push(m.gateway);
    if (m.raw) c.push(m.raw);
  });

  // 4) tokenUri(s): prefer gateway > raw; check both top-level and raw
  const tokenUris: Array<unknown> = [nft.tokenUri, nft.raw?.tokenUri];
  tokenUris.forEach(tu => {
    if (!tu) return;
    if (typeof tu === "string") c.push(tu);
    else {
      const obj = tu as { gateway?: string; raw?: string };
      if (obj.gateway) c.push(obj.gateway);
      if (obj.raw) c.push(obj.raw);
    }
  });

  // 5) As a last resort, if tokenUri points to JSON on IPFS (not the image),
  // the front-end will still try to load it; keep your <img onError> fallback.

  // Normalize to HTTP and filter out empties
  for (const cand of c) {
    const u = normalizeUrl(cand);
    if (u) return u;
  }
  return null;
}

/**
 * Optional: prefer a specific gateway (rotate if 429)
 */
export function preferGateway(url: string, gateway = GATEWAYS[0]) {
  try {
    const u = new URL(url);
    if (!/\/ipfs\//.test(u.pathname)) return url;
    const [, cidPlus] = u.pathname.split("/ipfs/");
    return `${gateway}${cidPlus || ""}`;
  } catch {
    return url;
  }
}

/**
 * Fetch NFTs for a specific owner using Alchemy API
 */
export async function getNFTsForOwner(
  owner: string, 
  contractAddresses?: string[]
): Promise<AlchemyNFT[]> {
  if (!ALCHEMY_API_KEY) {
    console.error('❌ NEXT_PUBLIC_ALCHEMY_KEY is not set');
    throw new Error('NEXT_PUBLIC_ALCHEMY_KEY is not set');
  }

  const baseUrl = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;
  
  const params = new URLSearchParams({
    owner,
    'withMetadata': 'true',
    'pageSize': '100'
  });

  // Add contract addresses filter if provided
  if (contractAddresses && contractAddresses.length > 0) {
    // Alchemy API expects each contract address as a separate parameter
    contractAddresses.forEach(address => {
      params.append('contractAddresses[]', address);
    });
    console.log('🔍 Filtering by contract addresses:', contractAddresses);
  } else {
    console.log('⚠️ No contract addresses provided - will fetch ALL NFTs');
  }

  const url = `${baseUrl}/getNFTsForOwner?${params.toString()}`;
  
  console.log('🔍 Alchemy API URL:', url);
  console.log('🔍 Contract addresses filter:', contractAddresses);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Alchemy API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('🔍 Alchemy API response:', {
      totalCount: data.totalCount,
      nfts: data.ownedNfts?.length || 0,
      hasError: !!data.error,
      error: data.error
    });
    
    if (data.error) {
      console.error('❌ Alchemy API returned error:', data.error);
      return [];
    }
    
    return data.ownedNfts || [];
  } catch (error) {
    console.error('❌ Failed to fetch NFTs from Alchemy:', error);
    throw error;
  }
}

/**
 * Fetch metadata for a specific NFT
 */
export async function getNFTMetadata(
  contractAddress: string,
  tokenId: string
): Promise<AlchemyNFTMetadata | null> {
  if (!ALCHEMY_API_KEY) {
    throw new Error('NEXT_PUBLIC_ALCHEMY_KEY is not set');
  }

  const baseUrl = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;
  const url = `${baseUrl}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    console.error(`Failed to fetch metadata for ${contractAddress}:${tokenId}`);
    return null;
  }
  
  const data = await response.json();
  return data;
}

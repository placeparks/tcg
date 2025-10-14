"use client";

import { useEffect, useState, MouseEvent } from "react";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  usePublicClient
} from "wagmi";
import { formatEther, decodeErrorResult } from "viem";
import Image    from "next/image";
import Link     from "next/link";
import toast    from "react-hot-toast";
import {
  Sparkles,
   ShoppingCart,
   Loader2,
  X
} from "lucide-react";

import { CONTRACTS } from "@/lib/contract";
import { Badge }     from "@/components/ui/badge";
import { getNFTMetadata, getBestImageUrl } from "@/lib/alchemy";

/* helpers */
const ipfsToHttp = (u: string) => {
  if (u.startsWith("http")) return u;
  const hash = u.replace(/^ipfs:\/\//, "");
  // Use our API proxy as fallback
  return `/api/ipfs-proxy/${hash}`;
};

const extractCidFromUri = (uri: string): string | null => {
  if (uri.startsWith("http")) return null;
  const match = uri.match(/^ipfs:\/\/(.+)/);
  return match ? match[1] : null;
};

/* Request throttling and caching */
const requestQueue: Array<() => Promise<void>> = [];
let isProcessing = false;
const metadataCache = new Map<string, { image: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;
  
  isProcessing = true;
  const request = requestQueue.shift();
  if (request) {
    try {
      await request();
    } catch (error) {
      console.error('Request failed:', error);
    }
  }
  isProcessing = false;
  
  // Process next request after a delay (increased to reduce rate limiting)
  setTimeout(() => processQueue(), 1000);
}

function queueRequest(request: () => Promise<void>) {
  requestQueue.push(request);
  processQueue();
}

interface Props {
  collection: `0x${string}`;
  id: bigint;
}

type ListingStruct = { seller: `0x${string}`; price: bigint };

export default function NFTCard({ collection, id }: Props) {
  /* wallet hooks */
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: 84532 })!;

  /* image + metadata loading */
  const [img, setImg]         = useState<string | null>(null);
  const [loadingImg, setLoad] = useState(true);

  // ERC721 tokenURI functionality commented out - using ERC1155 uri instead
  const { data: tokenUri } = useReadContract({
    address:       collection,
    abi:           [{ name: "uri", type: "function", stateMutability: "view", inputs: [{ type:"uint256"}], outputs: [{ type:"string"}] }],
    functionName:  "uri",
    args:          [id]
  });

  useEffect(() => {
    if (!tokenUri || !collection || !id) return;

    const cacheKey = `${collection}-${id}`;
    const cached = metadataCache.get(cacheKey);

    // Check if we have valid cached data
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setImg(cached.image);
      setLoad(false);
      return;
    }
    
    // Queue the request to avoid rate limiting
    queueRequest(async () => {
      let imageUrl = null;
      
      try {
        // Try Alchemy API first (most reliable)
        try {
          const metadata = await getNFTMetadata(collection, id.toString());
          if (metadata && metadata.image) {
            // Handle both string and object image formats
            if (typeof metadata.image === 'string') {
              imageUrl = metadata.image;
            } else if (metadata.image && typeof metadata.image === 'object') {
              imageUrl = metadata.image.cachedUrl || metadata.image.originalUrl;
            }
          }
          
          if (imageUrl) {
            console.log('✅ Alchemy API success for', collection, id);
          }
        } catch (alchemyError) {
          console.log('Alchemy API failed, trying IPFS fallback:', alchemyError);
          
          // Fallback to IPFS proxy if Alchemy fails
          const cid = extractCidFromUri(tokenUri as string);
          if (cid) {
            try {
              const response = await fetch(`/api/ipfs-proxy/${cid}`);
              if (response.ok) {
                const contentType = response.headers.get('content-type') || '';
                
                if (contentType.includes('application/json')) {
                  const meta = await response.json();
                  if (meta && typeof meta === 'object' && meta.image) {
                    imageUrl = ipfsToHttp(meta.image);
                  }
                } else if (contentType.includes('image/')) {
                  imageUrl = response.url;
                }
              }
            } catch (proxyError) {
              console.error('IPFS proxy also failed:', proxyError);
            }
          }
        }
        
        // Cache the result
        metadataCache.set(cacheKey, {
          image: imageUrl || '',
          timestamp: Date.now()
        });
        
        setImg(imageUrl || null);
      } catch (error) {
        console.error('Failed to fetch NFT metadata:', error);
        setImg(null);
      } finally {
        setLoad(false);
      }
    });
  }, [tokenUri, collection, id]);

  /* listing info - assume ERC1155 for now, could be enhanced to detect token type */
  const { data: listing } = useReadContract({
    address:       CONTRACTS.marketplace,
    abi:           CONTRACTS.marketplaceAbi,
    functionName:  "listings1155", // Using ERC1155 function since most of your NFTs are ERC1155
    args:          [collection, id]
  }) as { data: ListingStruct | undefined };

  const isListed = !!listing && listing.price > 0n;
  const isOwner  = isListed && address && address.toLowerCase() === listing.seller.toLowerCase();
  const priceStr = isListed ? formatEther(listing.price) : null;

  /* cancel-listing flow */
  async function cancel(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    if (!isOwner) return;

    toast.loading("Canceling listing…");
    try {
      const txHash = await writeContractAsync({
        address:       CONTRACTS.marketplace,
        abi:           CONTRACTS.marketplaceAbi,
        functionName:  "cancelListing1155", // Using ERC1155 function
        args:          [collection, id]
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      toast.dismiss();
      toast.success("Listing canceled");

    } catch (err: any) {
      toast.dismiss();
      /* best-effort decode */
      let msg = err?.shortMessage ?? "Cancel failed";
      try {
        const { errorName } = decodeErrorResult({
          abi:   CONTRACTS.marketplaceAbi,
          data:  err?.data?.data as `0x${string}`
        });
        msg = errorName;
      } catch { /* ignore */ }
      toast.error(msg);
    }
  }

  /* buy links go to dedicated page */
  const buyHref = `/${collection}/${id.toString()}`;

  return (
    <div className="group relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-3xl hover:border-white/40 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20">

      {/* image area */}
      <div className="relative overflow-hidden rounded-t-3xl">
        <div className="relative pb-[100%]">
          {img ? (
            <Image
              src={img}
              alt={`NFT #${id}`}
              fill
              sizes="(max-width:768px) 100vw, 33vw"
              className={`object-cover group-hover:scale-110 transition-all duration-700 ${loadingImg?"opacity-0":"opacity-100"}`}
              onLoadingComplete={() => setLoad(false)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              {loadingImg ? (
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              ) : (
                <Sparkles className="w-8 h-8 text-white" />
              )}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* badges */}
          <div className="absolute top-3 left-3 flex items-center space-x-2">
            <Badge className="bg-black/50 backdrop-blur-xl border border-white/20 text-white text-xs px-2 py-1">
              #{id.toString()}
            </Badge>

            {isListed && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold text-xs px-2 py-1">
                FOR SALE
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* content */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-bold text-white">NFT #{id.toString()}</h3>

          {isListed ? (
            <div className="text-right">
              <span className="text-xs text-gray-400">Price</span><br/>
              <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {priceStr} ETH
              </span>
            </div>
          ) : (
            <div className="text-right">
              <span className="text-xs text-gray-500">Status</span><br/>
              <span className="text-xs text-gray-400">Not Listed</span>
            </div>
          )}
        </div>

        {/* CTA */}
        {isListed ? (
          isOwner ? (
            <button
              onClick={cancel}
              className="group/btn w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-2.5 px-4 rounded-full transition-all duration-300 hover:scale-105"
            >
              <X className="w-4 h-4" />
              <span>Cancel Listing</span>
            </button>
          ) : (
            <Link
              href={buyHref}
              className="group/btn w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white font-semibold py-2.5 px-4 rounded-full transition-all duration-300 hover:scale-105"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Buy Now</span>
            </Link>
          )
        ) : (
          <div className="w-full flex items-center justify-center bg-white/5 backdrop-blur-xl border border-white/20 text-gray-400 font-medium py-2.5 px-4 rounded-full">
            Not For Sale
          </div>
        )}
      </div>
    </div>
  );
}
